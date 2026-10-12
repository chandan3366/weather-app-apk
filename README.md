# WeatherNow — React Native + Expo Weather App

Features:
- Search weather by city name
- Current temperature, feels-like temperature, humidity and wind
- Five-day forecast
- Sky-blue and white UI
- Loading and error messages
- Free Open-Meteo API; no API key required

## Run it
1. Extract this ZIP.
2. Open the `WeatherApp` folder in VS Code.
3. Open Terminal > New Terminal.
4. Run:
   ```bash
   npm install
   npx expo start
   ```
5. Install Expo Go on Android: https://expo.dev/go
6. Scan the QR code with Expo Go. Keep phone and laptop on the same Wi-Fi.

If the connection fails:
```bash
npx expo start --tunnel
```

## Files
- `app/index.tsx`: app UI, city search, API calls and styling
- `app/_layout.tsx`: app navigation layout
- `app.json`: Expo configuration
- `package.json`: dependencies

Weather API: https://open-meteo.com/en/docs
The project runs in Expo Go; it is not an APK installer. For APK builds, see https://docs.expo.dev/build/setup/
