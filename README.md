# Can Do Project — coming-soon page

Holding page for Can Do Project while the Shopify store is built. Three design directions, plain HTML/CSS/JS with no build step:

| Folder | Direction |
|---|---|
| `v1-playground/` | Kinetic type, throwable brand coins, product easels on a pinned deck |
| `v2-sleeves/` | The packaging as the page: sleeve slides off, horizontal run of product sleeves |
| `v3-stamp/` | One quiet screen: coin grid that ripples on its own and from clicks |

`index.html` links all three. Shared tokens, fonts (Alan Sans, Nunito Sans — both OFL), the brand-shape sprite, product images and GSAP 3.13 live in `assets/`.

## Run locally

Serve the folder with any static server, e.g.

```sh
python3 -m http.server 8765
```

and open http://127.0.0.1:8765/.

## Still to do

- Email signup forms have no backend: set `data-endpoint` on each `<form>` (Klaviyo / Shopify / Formspree).
- `og:image` tags use relative paths; make them absolute once the domain is live.
