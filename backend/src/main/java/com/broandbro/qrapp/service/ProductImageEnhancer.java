package com.broandbro.qrapp.service;

import org.springframework.stereotype.Component;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.awt.image.ConvolveOp;
import java.awt.image.Kernel;
import java.awt.image.RescaleOp;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

/**
 * Deterministic, dependency-free product photo enhancer (JDK ImageIO + Java2D only).
 * Crops away uniform studio backgrounds, lifts contrast slightly, sharpens, and
 * composes the product onto a square card-ready canvas as a JPEG.
 */
@Component
public class ProductImageEnhancer {

    public static final String OUTPUT_CONTENT_TYPE = "image/jpeg";
    static final int CARD_SIZE = 800;
    private static final double CONTENT_RATIO = 0.88;
    private static final int BORDER_DISTANCE = 36;
    private static final int MIN_SUBJECT_AREA_PERCENT = 2;
    private static final int CROP_PADDING_PERCENT = 3;
    private static final float JPEG_QUALITY = 0.90f;
    private static final Color CARD_BACKGROUND = new Color(0xFB, 0xF8, 0xF4);
    private static final float CONTRAST = 1.06f;
    private static final float BRIGHTNESS_OFFSET = -4f;
    private static final float[] SHARPEN_KERNEL = {
            0f, -0.5f, 0f,
            -0.5f, 3f, -0.5f,
            0f, -0.5f, 0f
    };

    public record Enhanced(byte[] bytes, String contentType) {
    }

    public Enhanced enhance(byte[] source) throws IOException {
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(source));
        if (decoded == null) {
            throw new IOException("Unsupported image content");
        }
        BufferedImage flat = flattenOnWhite(decoded);
        BufferedImage cropped = cropToSubject(flat);
        BufferedImage tuned = tune(cropped);
        BufferedImage card = composeCard(tuned);
        return new Enhanced(writeJpeg(card), OUTPUT_CONTENT_TYPE);
    }

    private BufferedImage flattenOnWhite(BufferedImage source) {
        BufferedImage rgb = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, rgb.getWidth(), rgb.getHeight());
        g.drawImage(source, 0, 0, null);
        g.dispose();
        return rgb;
    }

    private BufferedImage cropToSubject(BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();
        int[] background = estimateBackground(image);
        int minX = width, minY = height, maxX = -1, maxY = -1;
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                if (colorDistance(image.getRGB(x, y), background) > BORDER_DISTANCE) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0) {
            return image;
        }
        long subjectArea = (long) (maxX - minX + 1) * (maxY - minY + 1);
        long totalArea = (long) width * height;
        if (subjectArea * 100 < totalArea * MIN_SUBJECT_AREA_PERCENT) {
            return image;
        }
        int padX = Math.max(1, width * CROP_PADDING_PERCENT / 100);
        int padY = Math.max(1, height * CROP_PADDING_PERCENT / 100);
        Rectangle box = new Rectangle(minX, minY, maxX - minX + 1, maxY - minY + 1);
        box = box.intersection(new Rectangle(0, 0, width, height));
        int x0 = Math.max(0, box.x - padX);
        int y0 = Math.max(0, box.y - padY);
        int x1 = Math.min(width, box.x + box.width + padX);
        int y1 = Math.min(height, box.y + box.height + padY);
        if ((long) (x1 - x0) * (y1 - y0) > totalArea * 95 / 100) {
            return image;
        }
        return image.getSubimage(x0, y0, x1 - x0, y1 - y0);
    }

    /** Average of the four border strips; a rough estimate of the studio backdrop colour. */
    private int[] estimateBackground(BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();
        long r = 0, g = 0, b = 0, count = 0;
        int step = Math.max(1, Math.min(width, height) / 100);
        for (int x = 0; x < width; x += step) {
            for (int[] p : new int[][]{{x, 0}, {x, height - 1}}) {
                int rgb = image.getRGB(p[0], p[1]);
                r += (rgb >> 16) & 0xFF;
                g += (rgb >> 8) & 0xFF;
                b += rgb & 0xFF;
                count++;
            }
        }
        for (int y = 0; y < height; y += step) {
            for (int[] p : new int[][]{{0, y}, {width - 1, y}}) {
                int rgb = image.getRGB(p[0], p[1]);
                r += (rgb >> 16) & 0xFF;
                g += (rgb >> 8) & 0xFF;
                b += rgb & 0xFF;
                count++;
            }
        }
        return new int[]{(int) (r / count), (int) (g / count), (int) (b / count)};
    }

    private int colorDistance(int rgb, int[] background) {
        return Math.abs(((rgb >> 16) & 0xFF) - background[0])
                + Math.abs(((rgb >> 8) & 0xFF) - background[1])
                + Math.abs((rgb & 0xFF) - background[2]);
    }

    private BufferedImage tune(BufferedImage image) {
        RescaleOp contrast = new RescaleOp(CONTRAST, BRIGHTNESS_OFFSET, null);
        BufferedImage lifted = contrast.filter(image, null);
        ConvolveOp sharpen = new ConvolveOp(new Kernel(3, 3, SHARPEN_KERNEL), ConvolveOp.EDGE_NO_OP, null);
        return sharpen.filter(lifted, null);
    }

    private BufferedImage composeCard(BufferedImage product) {
        BufferedImage card = new BufferedImage(CARD_SIZE, CARD_SIZE, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = card.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(CARD_BACKGROUND);
        g.fillRect(0, 0, CARD_SIZE, CARD_SIZE);
        double target = CARD_SIZE * CONTENT_RATIO;
        double scale = Math.min(target / product.getWidth(), target / product.getHeight());
        int drawWidth = (int) Math.round(product.getWidth() * scale);
        int drawHeight = (int) Math.round(product.getHeight() * scale);
        int offsetX = (CARD_SIZE - drawWidth) / 2;
        int offsetY = (CARD_SIZE - drawHeight) / 2;
        g.drawImage(product, offsetX, offsetY, drawWidth, drawHeight, null);
        g.dispose();
        return card;
    }

    private byte[] writeJpeg(BufferedImage image) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) {
            throw new IOException("JPEG writer unavailable");
        }
        ImageWriter writer = writers.next();
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             ImageOutputStream stream = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(stream);
            ImageWriteParam param = writer.getDefaultWriteParam();
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
            writer.write(null, new IIOImage(image, null, null), param);
            stream.flush();
            return out.toByteArray();
        } finally {
            writer.dispose();
        }
    }
}
