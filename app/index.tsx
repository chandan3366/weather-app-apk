import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function weatherInfo(code: number, isDay: number = 1) {
  if (code === 0) return { label: 'Clear sky', icon: isDay ? '☀️' : '🌙' };
  if ([1, 2].includes(code)) return { label: 'Partly cloudy', icon: isDay ? '🌤️' : '☁️' };
  if (code === 3) return { label: 'Overcast', icon: '☁️' };
  if ([45, 48].includes(code)) return { label: 'Foggy', icon: '🌫️' };
  if ([51, 53, 55].includes(code)) return { label: 'Drizzle', icon: '🌦️' };
  if ([56, 57].includes(code)) return { label: 'Freezing drizzle', icon: '🌨️' };
  if ([61, 63, 65].includes(code)) return { label: 'Rainy', icon: '🌧️' };
  if ([66, 67].includes(code)) return { label: 'Freezing rain', icon: '🌨️' };
  if ([71, 73, 75, 77].includes(code)) return { label: 'Snowy', icon: '❄️' };
  if ([80, 81, 82].includes(code)) return { label: 'Rain showers', icon: '🌦️' };
  if ([85, 86].includes(code)) return { label: 'Snow showers', icon: '🌨️' };
  if (code === 95) return { label: 'Thunderstorm', icon: '⛈️' };
  if ([96, 99].includes(code)) return { label: 'Thunderstorm with hail', icon: '⛈️' };
  return { label: 'Weather conditions', icon: isDay ? '🌤️' : '☁️' };
}

type WeatherData = {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day?: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
};

export default function WeatherScreen() {
  const [city, setCity] = useState('Delhi');
  const [place, setPlace] = useState('Delhi');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const searchWeather = useCallback(async (query = city, isPullToRefresh = false) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Please enter a city name.');
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    Keyboard.dismiss();
    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    const timeoutId = setTimeout(() => {
      controller.abort('timeout');
    }, 12000);

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=en&format=json`;
      const geoResponse = await fetch(geoUrl, { signal: controller.signal });
      if (!geoResponse.ok) {
        throw new Error('City search failed. Please try again.');
      }
      const geoData = await geoResponse.json();
      const location = geoData.results?.[0];
      if (!location) {
        throw new Error('City not found. Check spelling and try again.');
      }

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
      const response = await fetch(weatherUrl, { signal: controller.signal });
      if (!response.ok) {
        throw new Error('Weather data unavailable. Please try again.');
      }
      const data = await response.json();

      setWeather(data);
      const formattedPlace = [location.name, location.admin1, location.country]
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', ');
      setPlace(formattedPlace);
    } catch (e: any) {
      if (controller.signal.aborted) {
        if (controller.signal.reason === 'timeout') {
          setError('Network request timed out. Please check your connection.');
        }
        return;
      }
      setError(e instanceof Error ? e.message : 'Unable to load weather. Please try again.');
    } finally {
      clearTimeout(timeoutId);
      if (abortControllerRef.current === controller) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [city]);

  useEffect(() => {
    void searchWeather('Delhi');
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const current = weather?.current;
  const daily = weather?.daily;
  const condition = current ? weatherInfo(current.weather_code, current.is_day ?? 1) : null;

  const maxToday = daily?.temperature_2m_max?.[0] != null ? `${Math.round(daily.temperature_2m_max[0])}°` : '--°';
  const minToday = daily?.temperature_2m_min?.[0] != null ? `${Math.round(daily.temperature_2m_min[0])}°` : '--°';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void searchWeather(place || city, true)}
            colors={['#1687E8']}
            tintColor="#1687E8"
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>☁️ WeatherNow</Text>
            <Text style={styles.tagline}>Your daily weather companion</Text>
          </View>
          <View style={styles.badge} accessibilityLabel="Live weather updates active">
            <Text style={styles.badgeText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Search city (e.g. Agra)"
              placeholderTextColor="#7B8CA5"
              value={city}
              onChangeText={setCity}
              onSubmitEditing={() => void searchWeather()}
              returnKeyType="search"
              accessibilityRole="search"
              accessibilityLabel="City name input"
            />
            {city.length > 0 && (
              <Pressable
                style={styles.clearButton}
                onPress={() => setCity('')}
                accessibilityRole="button"
                accessibilityLabel="Clear city name"
                hitSlop={8}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </Pressable>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [styles.searchButton, pressed && styles.searchButtonPressed]}
            android_ripple={{ color: '#0B65B5' }}
            onPress={() => void searchWeather()}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel="Search city weather"
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>

        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#1687E8" />
            <Text style={styles.loadingText}>Getting latest weather…</Text>
          </View>
        )}

        {!!error && (
          <View style={styles.errorContainer} accessibilityRole="alert">
            <Text style={styles.error}>{error}</Text>
          </View>
        )}

        {current && condition && daily && (
          <>
            <View style={styles.hero}>
              <Text style={styles.location} numberOfLines={2} ellipsizeMode="tail">
                📍 {place}
              </Text>
              <Text style={styles.heroLabel}>CURRENT WEATHER</Text>
              <Text style={styles.weatherIcon}>{condition.icon}</Text>
              <View style={styles.tempRow}>
                <Text style={styles.temperature}>{Math.round(current.temperature_2m)}</Text>
                <Text style={styles.degree}>°C</Text>
              </View>
              <Text style={styles.condition}>{condition.label}</Text>
              <Text style={styles.feels}>Feels like {Math.round(current.apparent_temperature)}°C</Text>
              <View style={styles.highLow}>
                <Text style={styles.highLowText}>
                  ↑ {maxToday} · ↓ {minToday}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Today's details</Text>
            <View style={styles.detailsRow}>
              <View style={styles.detailCard}>
                <Text style={styles.detailIcon}>💧</Text>
                <Text style={styles.detailLabel}>Humidity</Text>
                <Text style={styles.detailValue}>{current.relative_humidity_2m}%</Text>
              </View>
              <View style={styles.detailCard}>
                <Text style={styles.detailIcon}>💨</Text>
                <Text style={styles.detailLabel}>Wind speed</Text>
                <Text style={styles.detailValue}>
                  {Math.round(current.wind_speed_10m)} <Text style={styles.unit}>km/h</Text>
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>5-day forecast</Text>
            <View style={styles.forecastCard}>
              {daily.time.map((date, index) => {
                const info = weatherInfo(daily.weather_code[index] ?? 0);
                const day =
                  index === 0
                    ? 'Today'
                    : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
                const max =
                  daily.temperature_2m_max[index] != null
                    ? `${Math.round(daily.temperature_2m_max[index])}°`
                    : '--°';
                const min =
                  daily.temperature_2m_min[index] != null
                    ? `${Math.round(daily.temperature_2m_min[index])}°`
                    : '--°';

                return (
                  <View
                    key={date}
                    style={[styles.forecastRow, index === daily.time.length - 1 && styles.lastRow]}
                  >
                    <Text style={styles.day}>{day}</Text>
                    <Text style={styles.forecastIcon}>{info.icon}</Text>
                    <Text style={styles.forecastCondition} numberOfLines={1}>
                      {info.label}
                    </Text>
                    <Text style={styles.maxTemp}>
                      {max} <Text style={styles.minTemp}>{min}</Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.footer}>Weather data provided by Open-Meteo</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#EAF6FF' },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  brand: { fontSize: 27, fontWeight: '800', color: '#0F172A' },
  tagline: { fontSize: 13, color: '#64748B', marginTop: 4 },
  badge: {
    backgroundColor: '#D4F8E8',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: { color: '#087B55', fontWeight: '800', fontSize: 10, letterSpacing: 1 },
  searchRow: { flexDirection: 'row', gap: 9, marginBottom: 22 },
  inputContainer: {
    flex: 1,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDEBFA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#0F172A',
  },
  clearButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
  searchButton: {
    backgroundColor: '#1687E8',
    paddingHorizontal: 18,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonPressed: {
    backgroundColor: '#0F74C7',
  },
  searchButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  loading: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  loadingText: { color: '#64748B', fontSize: 13 },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  error: { color: '#B91C1C', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  hero: {
    backgroundColor: '#1687E8',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    alignItems: 'center',
    marginBottom: 26,
  },
  location: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  heroLabel: {
    color: '#D9EEFF',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '800',
    marginTop: 17,
  },
  weatherIcon: { fontSize: 63, marginTop: 5 },
  tempRow: { flexDirection: 'row', alignItems: 'flex-start' },
  temperature: {
    color: '#FFFFFF',
    fontSize: 76,
    fontWeight: '800',
    includeFontPadding: false,
  },
  degree: { color: '#FFFFFF', fontSize: 27, fontWeight: '600', marginTop: 10 },
  condition: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  feels: { color: '#D9EEFF', fontSize: 13, marginTop: 6 },
  highLow: {
    backgroundColor: '#FFFFFF26',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 17,
  },
  highLowText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 14 },
  detailsRow: { flexDirection: 'row', gap: 12, marginBottom: 27 },
  detailCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E1EFFB',
  },
  detailIcon: { fontSize: 25 },
  detailLabel: { color: '#64748B', marginTop: 13, fontSize: 13 },
  detailValue: { color: '#0F172A', fontSize: 20, fontWeight: '800', marginTop: 5 },
  unit: { color: '#64748B', fontSize: 11, fontWeight: '600' },
  forecastCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E1EFFB',
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 59,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F8',
    gap: 7,
  },
  lastRow: { borderBottomWidth: 0 },
  day: { width: 48, color: '#0F172A', fontWeight: '700', fontSize: 13 },
  forecastIcon: { width: 28, textAlign: 'center', fontSize: 21 },
  forecastCondition: { flex: 1, color: '#64748B', fontSize: 11 },
  maxTemp: { color: '#0F172A', fontSize: 14, fontWeight: '800' },
  minTemp: { color: '#94A3B8', fontWeight: '600' },
  footer: { textAlign: 'center', color: '#7B8CA5', fontSize: 11, marginTop: 25 },
});