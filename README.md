<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1bZdSSdDEC4nte1DtgD8RlTNmOsJ-9RQ3

## Run Locally (Development)

**Prerequisites:** Node.js

1.  Install dependencies:
    `npm install`
2.  Run the development server:
    `npm run dev`

This will start a local server, typically at `http://localhost:3000`.

## Build for Production

1.  Run the build command:
    `npm run build`
2.  This creates a `dist` folder with the optimized, static application files. You can deploy this folder to any static hosting service.

To test the production build locally, you can use `npm run preview` or another static server like `serve`:

`npm install -g serve`
`serve -s dist`