# Can Do Project — coming-soon page

Holding page for Can Do Project while the Shopify store is built. Plain HTML/CSS/JS with no build step.

The page lives in `v1-playground/` (kinetic type, throwable brand coins, product easels on a pinned deck; swipe carousel on phones). The root `index.html` just redirects there. Shared tokens, fonts (Alan Sans, Nunito Sans — both OFL), the brand-shape sprite, product images and GSAP 3.13 live in `assets/`.

## Run locally

Serve the folder with any static server, e.g.

```sh
python3 -m http.server 8765
```

and open http://127.0.0.1:8765/.

## Still to do

- Email signup form has no backend: set `data-endpoint` on the `<form>` (Klaviyo / Shopify / Formspree).
- `og:image` tags use relative paths; make them absolute once the domain is live.
