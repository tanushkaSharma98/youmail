# Compose UI — Differences from Screenshot 3

Implementation matches the Compose Email + AI Draft view as specified. Possible differences from the reference screenshot:

1. **Compose trigger**  
   In the screenshot, compose is shown open. In the app it opens by default on load; there is no "Compose" button in the email list header (to avoid changing the base email list layout). After closing (backdrop or arrow), the panel is hidden; refresh the page to see it again until a Compose entry point is added.

2. **Header actions**  
   The three-dots control is implemented as a single icon button (more options). The screenshot may show additional header chrome; only "DRAFTING..." and the dots are implemented.

3. **AI suggestion block**  
   The area below the body is a single "AI suggestion" block with placeholder copy. If the screenshot uses multiple suggestions or a different layout (e.g. chips, separate cards), this is a simplified single-block version.

4. **Button order**  
   Buttons are: secondary (chevron/close) on the left, "Send Now" (primary) on the right. If the reference has the opposite order, the implementation can be swapped.

5. **Animation**  
   Compose uses a 250ms ease-out slide-in (slight translateX + opacity). If the reference uses a right-edge sliding panel instead of a centered overlay, the motion would differ (e.g. panel sliding from the right edge) but the base layout and styling are unchanged.

6. **Backdrop**  
   A light `bg-black/10` overlay is used; clicking it closes the compose panel. If the reference has no dimming or a different opacity, that is a minor visual difference.

7. **Typography / spacing**  
   Spacing and font sizes follow the design system (Tailwind scale, Inter). Any pixel-level differences from the screenshot would be in exact padding or font-size values.

8. **"Generate with AI"**  
   The spec mentioned this button "if visible". It is not present in the current implementation; only "Send Now" and the close (chevron) button are in the footer. It can be added in the same row if the design requires it.
