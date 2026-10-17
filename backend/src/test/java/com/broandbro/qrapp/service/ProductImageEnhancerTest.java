package com.broandbro.qrapp.service;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProductImageEnhancerTest {

    private final ProductImageEnhancer enhancer = new ProductImageEnhancer();

    @Test
    void producesSquareJpegCardFromSmallProductOnWhiteStudioBackground() throws IOException {
        BufferedImage source = new BufferedImage(1200, 900, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = source.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, 1200, 900);
        g.setColor(new Color(160, 60, 30));
        g.fillOval(400, 300, 400, 300);
        g.dispose();

        ProductImageEnhancer.Enhanced result = enhancer.enhance(png(source));

        assertThat(result.contentType()).isEqualTo("image/jpeg");
        BufferedImage card = ImageIO.read(new ByteArrayInputStream(result.bytes()));
        assertThat(card.getWidth()).isEqualTo(ProductImageEnhancer.CARD_SIZE);
        assertThat(card.getHeight()).isEqualTo(ProductImageEnhancer.CARD_SIZE);
        int center = card.getRGB(ProductImageEnhancer.CARD_SIZE / 2, ProductImageEnhancer.CARD_SIZE / 2);
        assertThat((center >> 16) & 0xFF).isGreaterThan(120);
    }

    @Test
    void keepsFullFrameForPhotoWithoutUniformBackground() throws IOException {
        BufferedImage source = new BufferedImage(640, 480, BufferedImage.TYPE_INT_RGB);
        for (int y = 0; y < 480; y++) {
            for (int x = 0; x < 640; x++) {
                source.setRGB(x, y, new Color(x % 256, y % 256, (x + y) % 256).getRGB());
            }
        }

        ProductImageEnhancer.Enhanced result = enhancer.enhance(png(source));

        BufferedImage card = ImageIO.read(new ByteArrayInputStream(result.bytes()));
        assertThat(card.getWidth()).isEqualTo(ProductImageEnhancer.CARD_SIZE);
        assertThat(card.getHeight()).isEqualTo(ProductImageEnhancer.CARD_SIZE);
    }

    @Test
    void rejectsContentThatIsNotAnImage() {
        assertThatThrownBy(() -> enhancer.enhance("not an image".getBytes()))
                .isInstanceOf(IOException.class);
    }

    private static byte[] png(BufferedImage image) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }
}
