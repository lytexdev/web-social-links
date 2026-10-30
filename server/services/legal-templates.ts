export interface PrivacyOptions {
  analyticsMode: 'aggregate' | 'visitors'
  retentionDays: number
  cloudflare: boolean
  affiliate: boolean
}

export const IMPRESSUM_TEMPLATE = `## Angaben gemäß § 5 DDG

{{Vor- und Nachname}}
{{Straße und Hausnummer}}
{{PLZ und Ort}}
{{Land}}

## Kontakt

E-Mail: {{E-Mail-Adresse}}
Telefon: {{Telefonnummer, optional}}

## Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV

{{Vor- und Nachname}}
{{Anschrift}}

## Hinweis

Diese Vorlage ersetzt keine Rechtsberatung. Prüfe, welche Angaben für dich gelten, und entferne alle Platzhalter in geschweiften Klammern.
`

export function generatePrivacyPolicy(options: PrivacyOptions): string {
  const sections: string[] = []
  sections.push(`> Vorlage. Ersetze alle Platzhalter in geschweiften Klammern und prüfe jeden Abschnitt. Diese Vorlage ersetzt keine Rechtsberatung.

## 1. Verantwortlicher

{{Vor- und Nachname}}
{{Anschrift}}
E-Mail: {{E-Mail-Adresse}}`)

  sections.push(`## 2. Hosting und Server-Logfiles

Diese Seite läuft auf einem Server von {{Hostinganbieter}} in {{Standort, z. B. Frankfurt am Main}}. Vor der Anwendung arbeitet ein Reverse Proxy. Beim Aufruf verarbeiten Proxy und Anwendung technisch notwendige Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, übertragene Datenmenge, Statuscode, Referrer und Browserkennung. Das dient dem Betrieb und der Sicherheit der Seite. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Die Protokolle werden nach {{Anzahl}} Tagen gelöscht.

Die Anwendung selbst speichert IP-Adressen nur in ihrem Sicherheitsprotokoll, etwa bei fehlgeschlagenen Anmeldungen am Verwaltungsbereich oder beim Aufruf typischer Angriffspfade. Diese Einträge werden nach 30 Tagen gelöscht.`)

  if (options.cloudflare) {
    sections.push(`## 3. Cloudflare

Die Seite wird über das Netzwerk der Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA, ausgeliefert. Cloudflare verarbeitet dabei die Verbindungsdaten deines Aufrufs, um die Seite auszuliefern und vor Angriffen zu schützen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Cloudflare ist unter dem EU-US Data Privacy Framework zertifiziert. Mit Cloudflare besteht ein Vertrag zur Auftragsverarbeitung.`)
  }

  const analytics =
    options.analyticsMode === 'aggregate'
      ? `Gezählt werden Seitenaufrufe und Klicks auf Links. Gespeichert werden Zeitpunkt, angeklickter Link, Herkunft (zum Beispiel Instagram oder direkter Aufruf), nur der Hostname der verweisenden Seite, UTM-Parameter, Gerätetyp, Browser- und Betriebssystemfamilie sowie das Land, falls der Proxy es übermittelt. IP-Adressen und Kennungen werden für die Statistik nicht gespeichert. Ein Bezug zu einzelnen Personen ist nicht möglich.`
      : `Gezählt werden Seitenaufrufe und Klicks auf Links. Gespeichert werden Zeitpunkt, angeklickter Link, Herkunft (zum Beispiel Instagram oder direkter Aufruf), nur der Hostname der verweisenden Seite, UTM-Parameter, Gerätetyp, Browser- und Betriebssystemfamilie sowie das Land, falls der Proxy es übermittelt.

Um eindeutige Besucher pro Tag zu schätzen, wird aus IP-Adresse, Browserkennung und Hostname mit einem zufälligen Tagesschlüssel ein gekürzter Hashwert gebildet. Der Tagesschlüssel wird nach Tagesende gelöscht. Danach lässt sich der Hashwert weder auf die IP-Adresse zurückführen noch mit anderen Tagen verknüpfen. Sendet dein Browser das Signal „Global Privacy Control“ oder „Do Not Track“, wird kein Hashwert gebildet.`
  sections.push(`## ${options.cloudflare ? 4 : 3}. Reichweitenmessung ohne Cookies

Diese Seite misst ihre Reichweite auf dem eigenen Server, ohne Cookies, ohne Zugriff auf Speicher in deinem Endgerät, ohne JavaScript-Tracking und ohne Drittanbieter. ${analytics}

Rohdaten werden nach ${options.retentionDays} Tagen gelöscht, danach bleiben nur Tagessummen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Das berechtigte Interesse liegt darin zu erkennen, welche Inhalte genutzt werden und über welche Plattformen Besucher kommen.`)

  let number = options.cloudflare ? 5 : 4
  sections.push(`## ${number++}. Weiterleitung von Links

Links auf dieser Seite führen zunächst über eine Weiterleitung auf diesem Server. Dabei wird der Klick wie oben beschrieben gezählt. Anschließend leitet der Server dich zum Ziel weiter. Erst dann verarbeitet der Betreiber der Zielseite deine Daten nach seinen eigenen Bestimmungen.`)

  if (options.affiliate) {
    sections.push(`## ${number++}. Affiliate-Links

Einige Links sind Affiliate-Links und als Anzeige gekennzeichnet. Folgst du einem solchen Link, kann der Partner ({{Partnerprogramme}}) Cookies oder ähnliche Techniken einsetzen, um den Kauf dieser Seite zuzuordnen. Das geschieht erst nach deinem Klick und auf der Seite des Partners. Für dich ändert sich der Preis nicht.`)
  }

  sections.push(`## ${number++}. Cookies und Einbettungen

Öffentliche Seiten setzen keine Cookies und binden keine Inhalte von Drittanbietern ein, also keine Videos, Karten, Schriften oder Skripte fremder Server. Der Verwaltungsbereich nutzt ein technisch notwendiges Sitzungs-Cookie, das nur den Betreiber betrifft.`)

  sections.push(`## ${number}. Deine Rechte

Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Wende dich dafür an die oben genannte Adresse.

Du kannst dich bei einer Datenschutzaufsichtsbehörde beschweren (Art. 77 DSGVO), zum Beispiel bei {{zuständige Aufsichtsbehörde}}.

Stand: {{Datum}}`)

  return `${sections.join('\n\n')}\n`
}

export const PRIVACY_TEMPLATE = generatePrivacyPolicy({
  analyticsMode: 'aggregate',
  retentionDays: 30,
  cloudflare: false,
  affiliate: false,
})
