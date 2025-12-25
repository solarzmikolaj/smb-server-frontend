# SMB Frontend

Prosty frontend React do zarządzania plikami na serwerze SMB.

## Instalacja

```bash
npm install
```

## Uruchomienie

```bash
npm run dev
```

Aplikacja będzie dostępna pod adresem: http://localhost:3000

## Funkcjonalności

- Logowanie (hardcodowane: admin/admin123)
- Lista plików z serwera SMB
- Pobieranie plików
- Odświeżanie listy plików
- Wylogowanie

## Konfiguracja

Backend powinien działać na porcie 5000 (domyślnie). Jeśli backend działa na innym porcie, zmień konfigurację w `vite.config.js`.

