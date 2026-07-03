package com.broandbro.qrapp.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Binds aws.s3.* keys from application.yml.
 */
@Component
@ConfigurationProperties(prefix = "aws.s3")
@Data
public class AwsS3Properties {

    /** S3 bucket name for menu item images. */
    private String bucketName;

    /** AWS region (e.g. ap-south-1). */
    private String region;

    /** AWS access key – sourced from environment variable AWS_ACCESS_KEY_ID. */
    private String accessKey;

    /** AWS secret key – sourced from environment variable AWS_SECRET_ACCESS_KEY. */
    private String secretKey;

    /** Whether S3 uploading is enabled (set to false for local development). */
    private boolean enabled = true;
}

