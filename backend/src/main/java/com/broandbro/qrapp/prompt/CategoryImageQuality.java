package com.broandbro.qrapp.prompt;

import com.broandbro.qrapp.exception.OpenAiImageGenerationException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.function.Supplier;

/**
 * Cheap sanity checks for generated category images: valid format/dimensions and not
 * obviously dark or colourless. Deliberately pixel-statistics only, not subject detection.
 */
public final class CategoryImageQuality {

    private static final int MIN_DIMENSION = 256;
    private static final double MIN_MEAN_LUMA = 0.38;
    private static final double MIN_MEAN_SATURATION = 0.06;
    private static final double MAX_DARK_PIXEL_SHARE = 0.45;

    private CategoryImageQuality() {}

    /**
     * Generates an image, retrying once when the result is obviously dark or colourless.
     * Throws when both attempts fail so callers never persist or apply a bad image.
     */
    public static byte[] generateAcceptable(Supplier<byte[]> generator) {
        String problem = null;
        for (int attempt = 1; attempt <= 2; attempt++) {
            byte[] bytes = generator.get();
            detectContentType(bytes);
            problem = findProblem(bytes);
            if (problem == null) return bytes;
        }
        throw new OpenAiImageGenerationException("Generated category image was rejected: " + problem + ". Please regenerate.");
    }

    /** Returns the detected content type, or throws if the bytes are not a usable image. */
    public static String detectContentType(byte[] bytes) {
        if (bytes != null && bytes.length > 8) {
            if ((bytes[0] & 0xFF) == 0x89 && bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G') return "image/png";
            if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8) return "image/jpeg";
        }
        throw new OpenAiImageGenerationException("Generated category image has an unsupported format");
    }

    /** @return null when acceptable, otherwise a short reason. */
    public static String findProblem(byte[] bytes) {
        BufferedImage image;
        try {
            image = ImageIO.read(new ByteArrayInputStream(bytes));
        } catch (IOException e) {
            return "image could not be decoded";
        }
        if (image == null) return "image could not be decoded";
        if (image.getWidth() < MIN_DIMENSION || image.getHeight() < MIN_DIMENSION) return "image is too small";

        int step = Math.max(1, Math.min(image.getWidth(), image.getHeight()) / 64);
        double luma = 0, saturation = 0;
        long dark = 0, count = 0;
        for (int y = 0; y < image.getHeight(); y += step) {
            for (int x = 0; x < image.getWidth(); x += step) {
                int rgb = image.getRGB(x, y);
                double r = ((rgb >> 16) & 0xFF) / 255.0, g = ((rgb >> 8) & 0xFF) / 255.0, b = (rgb & 0xFF) / 255.0;
                double max = Math.max(r, Math.max(g, b)), min = Math.min(r, Math.min(g, b));
                double l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                luma += l;
                saturation += max == 0 ? 0 : (max - min) / max;
                if (l < 0.18) dark++;
                count++;
            }
        }
        luma /= count;
        saturation /= count;
        double darkShare = (double) dark / count;
        if (luma < MIN_MEAN_LUMA) return "image is too dark";
        if (darkShare > MAX_DARK_PIXEL_SHARE) return "image is dominated by dark areas";
        if (saturation < MIN_MEAN_SATURATION) return "image is washed out or grey";
        return null;
    }
}

