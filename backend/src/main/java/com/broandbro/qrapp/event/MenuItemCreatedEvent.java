package com.broandbro.qrapp.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * Published when a new MenuItem is successfully persisted.
 * Consumed by {@link com.broandbro.qrapp.listener.MenuItemCreatedListener}
 * to trigger async AI image generation.
 *
 * <p>Future-ready: this event can be serialised and forwarded to
 * RabbitMQ or Amazon SQS for distributed processing.
 */
@Getter
public class MenuItemCreatedEvent extends ApplicationEvent {

    private final Long menuItemId;
    private final String menuItemName;
    private final String categoryName;
    private final Boolean isVeg;

    public MenuItemCreatedEvent(Object source, Long menuItemId, String menuItemName,
                                String categoryName, Boolean isVeg) {
        super(source);
        this.menuItemId = menuItemId;
        this.menuItemName = menuItemName;
        this.categoryName = categoryName;
        this.isVeg = isVeg;
    }
}

