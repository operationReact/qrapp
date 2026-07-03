package com.broandbro.qrapp.listener;

import com.broandbro.qrapp.event.MenuItemCreatedEvent;
import com.broandbro.qrapp.service.ai.MenuItemImageGenerationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listens for {@link MenuItemCreatedEvent} and triggers async AI image generation.
 *
 * <p>This is intentionally decoupled from the creation flow so that:
 * <ul>
 *   <li>The API response is never blocked by image generation.</li>
 *   <li>The listener can be replaced with a RabbitMQ/SQS consumer without
 *       changing any other code.</li>
 * </ul>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MenuItemCreatedListener {

    private final MenuItemImageGenerationService imageGenerationService;

    /**
     * Handles a new menu item creation event.
     * Triggers async image generation – the method itself returns immediately.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMenuItemCreated(MenuItemCreatedEvent event) {
        log.info("[Listener] MenuItemCreatedEvent received for menuItemId={} name='{}'",
                event.getMenuItemId(), event.getMenuItemName());

        // Delegate to async service – returns immediately, runs on imageGenerationExecutor
        imageGenerationService.generateImageForMenuItem(event.getMenuItemId(), false);
    }
}

