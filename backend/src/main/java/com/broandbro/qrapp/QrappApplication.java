package com.broandbro.qrapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class QrappApplication {

	public static void main(String[] args) {
		// AWS Parameter Store is initialized before Spring profile properties are available.
		//System.setProperty("aws.region", System.getProperty("aws.region", "us-east-1"));
		SpringApplication app = new SpringApplication(QrappApplication.class);
		app.addInitializers(new com.broandbro.qrapp.config.LocalDevelopmentGuard());
		app.run(args);
	}

}
