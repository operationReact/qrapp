package com.broandbro.qrapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class QrappApplication {

	public static void main(String[] args) {
		SpringApplication.run(QrappApplication.class, args);
	}

}
