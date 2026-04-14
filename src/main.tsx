import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const clearLegacyPwaState = async () => {
	if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

	try {
		const registrations = await navigator.serviceWorker.getRegistrations();
		await Promise.all(registrations.map((registration) => registration.unregister()));

		if ("caches" in window) {
			const cacheKeys = await caches.keys();
			await Promise.all(
				cacheKeys
					.filter((key) => key.startsWith("workbox-") || key.startsWith("vite-pwa"))
					.map((key) => caches.delete(key))
			);
		}
	} catch {
		// Ignore cleanup failures and continue rendering the app.
	}
};

void clearLegacyPwaState();

createRoot(document.getElementById("root")!).render(<App />);
