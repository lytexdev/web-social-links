export interface CalculatorText {
  index: { title: string; open: string }
  common: {
    home: string
    all: string
    inputs: string
    result: string
    steps: string
    note: string
    noScript: string
    share: string
    submit: string
    copyLink: string
    copied: string
    remember: string
    rememberHint: string
  }
  calories: {
    sex: string
    sexes: { male: string; female: string }
    age: string
    ageUnit: string
    height: string
    weight: string
    fat: string
    fatHint: string
    activity: string
    activityHint: string
    levels: Record<string, string>
    levelHints: Record<string, string>
    sport: string
    sessions: string
    minutes: string
    intensity: string
    intensities: Record<string, string>
    bmr: string
    bmrHint: string
    lbm: string
    activityKcal: string
    sportKcal: string
    tdee: string
    tdeeHint: string
    bmi: string
    targets: string
    cut20: string
    cut10: string
    hold: string
    gain10: string
    perDay: string
    weeklyLoss: string
    stepMifflin: string
    stepKatch: string
    stepActivity: string
    stepSport: string
    stepTotal: string
    disclaimer: string
  }
  halflife: {
    substance: string
    searchSubstance: string
    noMatch: string
    preparation: string
    route: string
    routes: Record<string, string>
    routeHint: string
    routeNotes: Record<string, string>
    material: {
      amount: Record<string, string>
      potency: Record<string, string>
      content: string
      contentHint: string
      bio: string
      absorbed: string
      absorbedHint: string
    }
    weight: string
    weightHint: string
    sex: string
    sexes: Record<string, string>
    effectTitle: string
    effectChart: string
    effectChartHint: string
    effectChartAt: string
    effectNow: string
    onset: string
    peak: string
    effectEnd: string
    effectHint: string
    decayTitle: string
    bac: string
    rate: string
    rateUnit: string
    soberIn: string
    zeroHint: string
    stepZero: string
    stepMaterial: string
    active: string
    preparationNote: string
    categories: Record<string, string>
    dose: string
    unit: string
    hours: string
    hoursHint: string
    interval: string
    intervalHint: string
    remaining: string
    remainingOf: string
    percent: string
    halfLife: string
    halfRange: string
    halfHint: string
    times: string
    t50: string
    t25: string
    t10: string
    t97: string
    t97Hint: string
    chart: string
    chartHint: string
    chartAt: string
    now: string
    repeatedTitle: string
    accumulation: string
    accumulationHint: string
    steadyPeak: string
    steadyTrough: string
    reference: string
    referenceHint: string
    metabolites: string
    blood: string
    urine: string
    substanceNote: string
    noModel: string
    duration: { minutes: string; hours: string; days: string }
    stepHalf: string
    stepRemaining: string
    stepTimes: string
    stepAccumulation: string
    disclaimer: string
  }
  peptide: {
    mode: string
    modes: Record<string, string>
    sprayVolume: string
    sprayVolumeHint: string
    sprayPicture: string
    sprayPictureHint: string
    sprayDose: string
    sprayVial: string
    sprays: string
    drawSpray: string
    perSpray: string
    spraysPerVial: string
    columnSprays: string
    stepSpray: string
    vial: string
    vialHint: string
    solvent: string
    solventHint: string
    dose: string
    unit: string
    units: Record<string, string>
    syringe: string
    scales: Record<string, string>
    scaleHint: string
    size: string
    sizeOption: string
    draw: string
    drawUnit: string
    volume: string
    concentration: string
    mcgPerUnit: string
    coverage: string
    coverageValue: string
    rest: string
    alternatives: string
    alternativesHint: string
    columnSolvent: string
    columnConcentration: string
    columnUnits: string
    columnFits: string
    fits: string
    unsuitable: string
    current: string
    overCapacity: string
    tooSmall: string
    stepConcentration: string
    stepDose: string
    stepVolume: string
    stepUnits: string
    stepCoverage: string
    disclaimer: string
  }
}

export const CALCULATOR_TEXT: Record<'de' | 'en', CalculatorText> = {
  de: {
    index: { title: 'Rechner', open: 'Rechner öffnen' },
    common: {
      home: 'Zur Startseite',
      all: 'Alle Rechner',
      inputs: 'Eingaben',
      result: 'Ergebnis',
      steps: 'Rechenweg',
      note: 'Hinweis',
      noScript:
        'Ohne JavaScript rechnet die Seite beim Absenden des Formulars. Mit JavaScript aktualisiert sich das Ergebnis beim Tippen.',
      share: 'Die Adresse der Seite enthält deine Eingaben und lässt sich so teilen.',
      submit: 'Berechnen',
      copyLink: 'Link kopieren',
      copied: 'Kopiert',
      remember: 'Eingaben auf diesem Gerät merken',
      rememberHint:
        'Speichert deine Eingaben nur in deinem Browser, damit sie beim nächsten Besuch wieder da sind. Nichts davon wird übertragen oder gespeichert. Nimm den Haken weg, um die Daten zu löschen.',
    },
    calories: {
      sex: 'Biologisches Geschlecht',
      sexes: { male: 'Männlich', female: 'Weiblich' },
      age: 'Alter',
      ageUnit: 'Jahre',
      height: 'Größe in cm',
      weight: 'Gewicht in kg',
      fat: 'Körperfettanteil in Prozent',
      fatHint:
        'Nur ausfüllen, wenn du ihn gemessen kennst. Dann rechnet die Seite nach Katch-McArdle über die fettfreie Masse statt nach Mifflin-St Jeor.',
      activity: 'Alltagsaktivität ohne Sport',
      activityHint: 'Beruf und Alltag, nicht das Training.',
      levels: {
        sitting: 'Sitzend',
        light: 'Leicht aktiv',
        moderate: 'Mäßig aktiv',
        high: 'Sehr aktiv',
        veryHigh: 'Körperlich schwer',
      },
      levelHints: {
        sitting: 'Büro, überwiegend sitzend, wenig Gehen',
        light: 'Sitzend mit etwas Gehen, leichte Hausarbeit',
        moderate: 'Viel auf den Beinen, zum Beispiel Verkauf oder Pflege',
        high: 'Handwerk, Lager, dauerhaft körperlich',
        veryHigh: 'Bau, Landwirtschaft, schwere körperliche Arbeit',
      },
      sport: 'Sport pro Woche',
      sessions: 'Einheiten pro Woche',
      minutes: 'Minuten pro Einheit',
      intensity: 'Intensität',
      intensities: { easy: 'Locker', medium: 'Mittel', hard: 'Hart' },
      bmr: 'Grundumsatz',
      bmrHint: 'Was dein Körper in völliger Ruhe über 24 Stunden verbraucht.',
      lbm: 'Fettfreie Masse',
      activityKcal: 'Alltag ohne Sport',
      sportKcal: 'Sport pro Tag',
      tdee: 'Gesamtumsatz',
      tdeeHint: 'Grundumsatz plus Alltag plus Sport, als Tagesdurchschnitt.',
      bmi: 'BMI',
      targets: 'Zielwerte',
      cut20: 'Defizit 20 Prozent',
      cut10: 'Defizit 10 Prozent',
      hold: 'Gewicht halten',
      gain10: 'Aufbau 10 Prozent',
      perDay: 'kcal pro Tag',
      weeklyLoss: 'Rechnerisch etwa {value} kg Fettmasse pro Woche beim Defizit von 20 Prozent.',
      stepMifflin: 'Grundumsatz nach Mifflin-St Jeor aus Gewicht, Größe, Alter und Geschlecht.',
      stepKatch:
        'Fettfreie Masse aus Gewicht und Körperfettanteil, daraus der Grundumsatz nach Katch-McArdle.',
      stepActivity: 'Grundumsatz mal Aktivitätsfaktor {value} ergibt den Verbrauch im Alltag.',
      stepSport:
        'Sport über den MET-Wert {met}: MET mal 3,5 mal Gewicht geteilt durch 200 ergibt kcal pro Minute, mal Dauer und Einheiten, verteilt auf sieben Tage.',
      stepTotal: 'Alltag plus Sport ergibt den Gesamtumsatz.',
      disclaimer:
        'Die Werte sind statistische Schätzungen aus Formeln für Gruppen. Der tatsächliche Verbrauch weicht individuell ab. Der Rechner ist keine Ernährungs- oder Gesundheitsberatung.',
    },
    halflife: {
      substance: 'Wirkstoff',
      searchSubstance: 'Wirkstoff suchen',
      noMatch: 'Kein Wirkstoff gefunden.',
      preparation: 'Präparat',
      route: 'Einnahmeart',
      routes: {
        oral: 'Oral, geschluckt',
        sublingual: 'Sublingual, unter der Zunge',
        buccal: 'Bukkal, in der Wange',
        inhaled: 'Inhaliert',
        smoked: 'Geraucht',
        vaporized: 'Verdampft',
        intranasal: 'Intranasal, über die Nase',
        transdermal: 'Transdermal, über die Haut',
        subcutaneous: 'Subkutan, unter die Haut',
        intramuscular: 'Intramuskulär, in den Muskel',
        intravenous: 'Intravenös, in die Vene',
      },
      routeHint:
        'Die Einnahmeart ändert, wie schnell der Stoff wirkt und wie viel davon überhaupt ins Blut gelangt. Die Halbwertszeit der Ausscheidung bleibt davon unberührt, deshalb rechnet die Seite damit weiter.',
      routeNotes: {
        oral: 'Wirkungseintritt nach etwa 30 bis 90 Minuten. Der erste Weg führt durch die Leber, die oft einen erheblichen Teil abbaut.',
        sublingual:
          'Wirkungseintritt nach etwa 10 bis 30 Minuten. Die Aufnahme über die Mundschleimhaut umgeht die Leber zum Teil.',
        buccal:
          'Wirkungseintritt nach etwa 15 bis 45 Minuten, ähnlich sublingual, aber langsamer und gleichmäßiger.',
        inhaled:
          'Wirkungseintritt nach Sekunden bis wenigen Minuten, weil der Stoff direkt über die Lunge ins Blut geht.',
        intranasal:
          'Wirkungseintritt nach etwa 5 bis 15 Minuten. Wie viel ankommt, schwankt je nach Schleimhaut stark.',
        transdermal:
          'Wirkungseintritt nach Stunden, dafür gleichmäßig über den ganzen Tragezeitraum.',
        subcutaneous:
          'Wirkungseintritt nach etwa 15 bis 30 Minuten, die Aufnahme ist langsamer und gleichmäßiger als in den Muskel.',
        intramuscular:
          'Wirkungseintritt nach etwa 10 bis 20 Minuten, schneller als unter die Haut.',
        smoked:
          'Wirkungseintritt nach Sekunden bis wenigen Minuten. Beim Verbrennen geht ein Teil des Wirkstoffs verloren.',
        vaporized:
          'Wirkungseintritt nach Sekunden bis wenigen Minuten. Beim Verdampfen kommt etwas mehr an als beim Rauchen, weil weniger verbrennt.',
        intravenous: 'Sofort vollständig im Blut, ohne Aufnahmephase.',
      },
      material: {
        amount: {
          flower: 'Menge Blüten in Gramm',
          powder: 'Menge Blattpulver in Gramm',
          drink: 'Getränkemenge in Milliliter',
        },
        potency: {
          thc: 'THC-Gehalt in Prozent',
          cbd: 'CBD-Gehalt in Prozent',
          hhc: 'HHC-Gehalt in Prozent',
          mitragynine: 'Mitragynin-Gehalt in Prozent',
          alcohol: 'Alkoholgehalt in Volumenprozent',
        },
        content: 'Enthaltener Wirkstoff',
        contentHint: 'Menge mal Gehalt. Das ist die Menge im Material, nicht die Menge im Blut.',
        bio: 'Bioverfügbarkeit',
        absorbed: 'Davon im Blut',
        absorbedHint:
          'Nur ein Teil des Wirkstoffs gelangt in den Blutkreislauf. Wie groß dieser Teil ist, hängt vor allem von der Einnahmeart ab und schwankt von Mensch zu Mensch erheblich. Die Rechnung nimmt den typischen Wert aus der Literatur.',
      },
      weight: 'Körpergewicht in Kilogramm',
      weightHint: 'Wird für die Verteilung im Körperwasser gebraucht.',
      sex: 'Biologisches Geschlecht',
      sexes: { male: 'Männlich', female: 'Weiblich' },
      effectTitle: 'Wirkverlauf',
      effectChart: 'Wirkverlauf mit der aktuellen Stunde als Punkt',
      effectChartHint:
        'Fahre über die Kurve oder tippe sie an, um einen Zeitpunkt abzulesen. Mit den Pfeiltasten geht es ebenso.',
      effectChartAt: 'Nach {time}: {percent} Prozent der stärksten Wirkung',
      effectNow: 'Wirkung jetzt',
      onset: 'Wirkungseintritt',
      peak: 'Stärkste Wirkung',
      effectEnd: 'Wirkung abgeklungen',
      effectHint:
        'Die Kurve ist ein Modell aus Wirkungseintritt, Maximum und Dauer und zeigt die Stärke im Verhältnis zum eigenen Höchstwert, nicht die gemessene Menge im Blut. Je nach Person, Magenfüllung und Gewöhnung verschiebt sie sich.',
      decayTitle: 'Abbau im Körper',
      bac: 'Höchster Promillewert',
      rate: 'Abbau pro Stunde',
      rateUnit: '‰ pro Stunde',
      soberIn: 'Bei null angekommen',
      zeroHint:
        'Alkohol hat keine Halbwertszeit: Der Spiegel sinkt um einen festen Betrag pro Stunde, nicht um einen Anteil. Die Rechnung folgt Widmark mit 0,15 Promille pro Stunde und ist eine grobe Schätzung, kein Nachweis der Fahrtüchtigkeit.',
      stepZero:
        'Promille: Gramm Alkohol geteilt durch (Körpergewicht mal Verteilungsfaktor). Danach 0,15 Promille Abzug pro Stunde.',
      stepMaterial:
        'Wirkstoff im Material: Menge mal Gehalt. Davon kommt der Anteil der Bioverfügbarkeit im Blut an.',
      active: 'Davon Wirkstoff',
      preparationNote: 'Zum Präparat',
      categories: {
        everyday: 'Alltag',
        sleep: 'Schlaf',
        adhd: 'ADHS',
        wakefulness: 'Wachheit',
        pain: 'Schmerz und Erkältung',
        allergy: 'Allergie',
        stomach: 'Magen',
        nutrients: 'Nährstoffe',
        cannabis: 'Cannabis',
        psychedelics: 'Psychedelika',
        mood: 'Stimmung und Psyche',
        nootropics: 'Nootropika',
        herbal: 'Pflanzlich',
        performance: 'Leistung',
      },
      dose: 'Eingenommene Menge',
      unit: 'Einheit',
      hours: 'Stunden seit der Einnahme',
      hoursHint: 'Halbe Stunden sind möglich, zum Beispiel 7,5.',
      interval: 'Einnahme alle ... Stunden',
      intervalHint:
        'Nur ausfüllen, wenn du den Stoff regelmäßig nimmst. Dann zeigt die Seite zusätzlich, wie viel sich ansammelt.',
      remaining: 'Noch im Körper',
      remainingOf: 'von {dose} {unit}',
      percent: 'Anteil der Dosis',
      halfLife: 'Halbwertszeit',
      halfRange: 'übliche Spanne {low} bis {high} h',
      halfHint:
        'Die Rechnung nimmt den typischen Wert für Erwachsene. Leber, Nieren, Gene, andere Medikamente und das Alter verschieben ihn.',
      times: 'Zeitpunkte',
      t50: 'Noch die Hälfte',
      t25: 'Noch ein Viertel',
      t10: 'Noch ein Zehntel',
      t97: 'Praktisch abgebaut',
      t97Hint: 'Nach fünf Halbwertszeiten sind etwa 97 Prozent weg.',
      chart: 'Abbaukurve mit der aktuellen Stunde als Punkt',
      chartHint:
        'Fahre über die Kurve oder tippe sie an, um einen Zeitpunkt abzulesen. Mit den Pfeiltasten geht es ebenso.',
      chartAt: 'Nach {time}: {percent} Prozent übrig',
      now: 'Jetzt',
      repeatedTitle: 'Bei regelmäßiger Einnahme',
      accumulation: 'Anreicherungsfaktor',
      accumulationHint:
        'Wer nachlegt, bevor der Stoff abgebaut ist, sammelt an. Der Gleichgewichtszustand ist nach etwa fünf Halbwertszeiten erreicht.',
      steadyPeak: 'Höchstwert im Gleichgewicht',
      steadyTrough: 'Tiefstwert im Gleichgewicht',
      reference: 'Angaben zum Wirkstoff',
      referenceHint:
        'Typische Werte für Erwachsene aus Fachinformationen und pharmakologischen Übersichtsarbeiten. Nachweiszeiten sind Literaturbereiche und lassen sich nicht auf eine Person umrechnen: Sie hängen von Dosis, Dauer des Konsums, Testverfahren und Grenzwert ab.',
      metabolites: 'Metaboliten',
      blood: 'Nachweis im Blut',
      urine: 'Nachweis im Urin',
      substanceNote: 'Besonderheit',
      noModel:
        'Für diesen Stoff ist beim Menschen keine Halbwertszeit gemessen worden, deshalb zeigt die Seite keine Abbaukurve. Der Wirkverlauf und die Angaben darunter gelten weiter.',
      duration: { minutes: 'min.', hours: 'h', days: 'Tage' },
      stepHalf: 'Der Rechner nimmt die typische Halbwertszeit von {half} Stunden.',
      stepRemaining: 'Verbleibende Menge: Dosis mal 0,5 hoch (Zeit geteilt durch Halbwertszeit).',
      stepTimes:
        'Die Zeitpunkte folgen aus derselben Formel, nach der Zeit aufgelöst: Halbwertszeit mal Logarithmus zur Basis 2.',
      stepAccumulation:
        'Anreicherung bei regelmäßiger Einnahme: 1 geteilt durch (1 minus 0,5 hoch (Abstand geteilt durch Halbwertszeit)).',
      disclaimer:
        'Keine medizinische Beratung und kein Aufruf zum Konsum. Der Rechner schätzt rechnerisch, wie viel einer Dosis nach einer bestimmten Zeit noch im Körper ist, nach einem vereinfachten Modell mit einer einzigen Halbwertszeit. Er ersetzt keine Messung, sagt keine Wirkung voraus und kann weder Fahrtüchtigkeit noch das Ergebnis eines Tests zu einem bestimmten Zeitpunkt bestimmen.',
    },
    peptide: {
      mode: 'Anwendung',
      modes: { syringe: 'Spritze', spray: 'Nasenspray' },
      sprayVolume: 'Sprühstoß in Mikroliter',
      sprayVolumeHint:
        'Menge, die ein Hub abgibt. Übliche Nasenspraypumpen geben 50 bis 140 Mikroliter ab, der Wert steht meist auf der Pumpe.',
      sprayPicture: 'Zeichnung einer Nasenspray-Flasche mit der Dosis als hellem Anteil',
      sprayPictureHint:
        'Der helle Anteil oben ist das Volumen einer Dosis, der dunkle Rest bleibt in der Flasche. Jeder Punkt darunter ist ein Hub.',
      sprayDose: 'Dosis',
      sprayVial: 'Flasche',
      sprays: 'Hübe',
      drawSpray: 'Zu sprühen',
      perSpray: 'Pro Hub',
      spraysPerVial: 'Hübe pro Vial',
      columnSprays: 'Hübe',
      stepSpray:
        'Konzentration mal Hubvolumen ergibt die Menge pro Hub, die Entnahmemenge geteilt durch diesen Wert die Zahl der Hübe.',
      vial: 'Peptidmenge im Vial in mg',
      vialHint: 'Steht auf dem Etikett, zum Beispiel 5 mg.',
      solvent: 'Lösungsmittel in ml',
      solventHint: 'Menge, die du in das Vial gibst.',
      dose: 'Entnahmemenge',
      unit: 'Einheit',
      units: { mcg: 'mcg', mg: 'mg' },
      syringe: 'Insulinspritze',
      scales: { u100: 'U-100', u40: 'U-40' },
      scaleHint:
        'U-100 bedeutet 100 Einheiten pro ml, U-40 bedeutet 40 Einheiten pro ml. Die Skala steht auf der Spritze.',
      size: 'Größe',
      sizeOption: '{ml} ml, {units} Einheiten',
      draw: 'Aufzuziehen',
      drawUnit: 'Einheiten',
      volume: 'Volumen',
      concentration: 'Konzentration',
      mcgPerUnit: 'Pro Einheit',
      coverage: 'Reichweite des Vials',
      coverageValue: '{whole} volle Entnahmen',
      rest: 'Rest im Vial',
      alternatives: 'Andere Lösungsmittelmengen',
      alternativesHint:
        'Dieselbe Entnahmemenge bei anderer Wassermenge. Werte zwischen 2 Einheiten und dem Fassungsvermögen der Spritze lassen sich am genauesten ablesen.',
      columnSolvent: 'Wasser',
      columnConcentration: 'Konzentration',
      columnUnits: 'Einheiten',
      columnFits: 'Ablesbar',
      fits: 'Gut',
      unsuitable: 'Ungünstig',
      current: 'Aktuelle Auswahl',
      overCapacity:
        'Die Menge passt nicht in die gewählte Spritze. Nimm eine größere Spritze oder weniger Lösungsmittel.',
      tooSmall:
        'Unter zwei Einheiten lässt sich auf der Skala kaum genau ablesen. Mehr Lösungsmittel macht den Wert größer.',
      stepConcentration:
        'Peptidmenge geteilt durch Lösungsmittel ergibt die Konzentration in mg pro ml.',
      stepDose: 'Die Entnahmemenge wird in mcg umgerechnet.',
      stepVolume: 'Entnahmemenge geteilt durch Konzentration ergibt das Volumen in ml.',
      stepUnits: 'Volumen mal {unitsPerMl} Einheiten pro ml ergibt die Einheiten auf der Skala.',
      stepCoverage: 'Gesamtmenge im Vial geteilt durch die Entnahmemenge ergibt die Reichweite.',
      disclaimer:
        'Der Rechner berechnet mathematisch Konzentration und Volumen für Labor- und Analysezwecke. Er gibt keine individuelle Dosierungs- oder Anwendungsempfehlung.',
    },
  },
  en: {
    index: { title: 'Calculators', open: 'Open calculator' },
    common: {
      home: 'Back to the start page',
      all: 'All calculators',
      inputs: 'Input',
      result: 'Result',
      steps: 'Calculation',
      note: 'Note',
      noScript:
        'Without JavaScript the page calculates when the form is submitted. With JavaScript the result updates as you type.',
      share: 'The address of the page carries your input and can be shared.',
      submit: 'Calculate',
      copyLink: 'Copy link',
      copied: 'Copied',
      remember: 'Remember the input on this device',
      rememberHint:
        'Keeps your input in your browser only, so it is there on your next visit. None of it is sent or stored anywhere else. Clear the box to delete it.',
    },
    calories: {
      sex: 'Biological sex',
      sexes: { male: 'Male', female: 'Female' },
      age: 'Age',
      ageUnit: 'years',
      height: 'Height in cm',
      weight: 'Weight in kg',
      fat: 'Body fat in percent',
      fatHint:
        'Only fill this in if you know a measured value. The page then uses Katch-McArdle over the fat free mass instead of Mifflin-St Jeor.',
      activity: 'Daily activity without sport',
      activityHint: 'Work and daily life, not training.',
      levels: {
        sitting: 'Sitting',
        light: 'Lightly active',
        moderate: 'Moderately active',
        high: 'Very active',
        veryHigh: 'Physically demanding',
      },
      levelHints: {
        sitting: 'Office, mostly seated, little walking',
        light: 'Seated with some walking, light housework',
        moderate: 'On your feet a lot, for example retail or care work',
        high: 'Trades, warehouse, physical throughout',
        veryHigh: 'Construction, farming, heavy physical work',
      },
      sport: 'Sport per week',
      sessions: 'Sessions per week',
      minutes: 'Minutes per session',
      intensity: 'Intensity',
      intensities: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
      bmr: 'Basal metabolic rate',
      bmrHint: 'What your body uses over 24 hours at complete rest.',
      lbm: 'Fat free mass',
      activityKcal: 'Daily life without sport',
      sportKcal: 'Sport per day',
      tdee: 'Total expenditure',
      tdeeHint: 'Basal rate plus daily life plus sport, as a daily average.',
      bmi: 'BMI',
      targets: 'Targets',
      cut20: 'Deficit 20 percent',
      cut10: 'Deficit 10 percent',
      hold: 'Keep weight',
      gain10: 'Surplus 10 percent',
      perDay: 'kcal per day',
      weeklyLoss: 'Arithmetically about {value} kg of fat mass per week at the 20 percent deficit.',
      stepMifflin: 'Basal rate by Mifflin-St Jeor from weight, height, age and sex.',
      stepKatch: 'Fat free mass from weight and body fat, then the basal rate by Katch-McArdle.',
      stepActivity:
        'Basal rate times the activity factor {value} gives the daily life expenditure.',
      stepSport:
        'Sport through the MET value {met}: MET times 3.5 times weight divided by 200 gives kcal per minute, times duration and sessions, spread over seven days.',
      stepTotal: 'Daily life plus sport gives the total expenditure.',
      disclaimer:
        'The values are statistical estimates from formulas built for groups. Actual expenditure differs individually. The calculator is not nutritional or health advice.',
    },
    halflife: {
      substance: 'Substance',
      searchSubstance: 'Search substance',
      noMatch: 'No substance found.',
      preparation: 'Preparation',
      route: 'Route',
      routes: {
        oral: 'Oral, swallowed',
        sublingual: 'Sublingual, under the tongue',
        buccal: 'Buccal, in the cheek',
        inhaled: 'Inhaled',
        smoked: 'Smoked',
        vaporized: 'Vaporized',
        intranasal: 'Intranasal, through the nose',
        transdermal: 'Transdermal, through the skin',
        subcutaneous: 'Subcutaneous, under the skin',
        intramuscular: 'Intramuscular, into the muscle',
        intravenous: 'Intravenous, into the vein',
      },
      routeHint:
        'The route changes how fast a substance acts and how much of it reaches the blood at all. The elimination half-life is unaffected, so the page keeps calculating with it.',
      routeNotes: {
        oral: 'Onset after about 30 to 90 minutes. The first pass goes through the liver, which often breaks down a sizeable share.',
        sublingual:
          'Onset after about 10 to 30 minutes. Uptake through the lining of the mouth partly bypasses the liver.',
        buccal:
          'Onset after about 15 to 45 minutes, similar to sublingual but slower and steadier.',
        inhaled:
          'Onset within seconds to a few minutes, because the substance passes straight through the lungs into the blood.',
        intranasal:
          'Onset after about 5 to 15 minutes. How much arrives varies a lot with the state of the lining.',
        transdermal: 'Onset after hours, but steady across the whole wearing time.',
        subcutaneous:
          'Onset after about 15 to 30 minutes; uptake is slower and steadier than into the muscle.',
        intramuscular: 'Onset after about 10 to 20 minutes, faster than under the skin.',
        smoked: 'Onset within seconds to a few minutes. Burning destroys part of the substance.',
        vaporized:
          'Onset within seconds to a few minutes. Vaporizing delivers somewhat more than smoking because less is burnt.',
        intravenous: 'Fully in the blood at once, with no uptake phase.',
      },
      material: {
        amount: {
          flower: 'Amount of flower in grams',
          powder: 'Amount of leaf powder in grams',
          drink: 'Amount of drink in millilitres',
        },
        potency: {
          thc: 'THC content in percent',
          cbd: 'CBD content in percent',
          hhc: 'HHC content in percent',
          mitragynine: 'Mitragynine content in percent',
          alcohol: 'Alcohol content in percent by volume',
        },
        content: 'Substance it contains',
        contentHint: 'Amount times content. That is the amount in the material, not in the blood.',
        bio: 'Bioavailability',
        absorbed: 'Of that in the blood',
        absorbedHint:
          'Only part of the substance reaches the bloodstream. How large that part is depends mainly on the route and varies considerably between people. The calculation uses the typical value from the literature.',
      },
      weight: 'Body weight in kilograms',
      weightHint: 'Needed for the distribution in body water.',
      sex: 'Biological sex',
      sexes: { male: 'Male', female: 'Female' },
      effectTitle: 'Course of the effect',
      effectChart: 'Course of the effect with the current hour as a dot',
      effectChartHint:
        'Move over the curve or tap it to read a point in time. The arrow keys work too.',
      effectChartAt: 'After {time}: {percent} percent of the strongest effect',
      effectNow: 'Effect now',
      onset: 'Onset',
      peak: 'Strongest effect',
      effectEnd: 'Effect faded',
      effectHint:
        'The curve is a model built from onset, peak and duration and shows the strength relative to its own maximum, not the measured amount in the blood. It shifts with the person, the stomach and tolerance.',
      decayTitle: 'Breakdown in the body',
      bac: 'Highest level',
      rate: 'Cleared per hour',
      rateUnit: 'per mille per hour',
      soberIn: 'Back at zero',
      zeroHint:
        'Alcohol has no half-life: the level falls by a fixed amount per hour, not by a share. The calculation follows Widmark with 0.15 per mille per hour and is a rough estimate, not proof of fitness to drive.',
      stepZero:
        'Per mille: grams of alcohol divided by (body weight times the distribution factor). After that 0.15 per mille is taken off per hour.',
      stepMaterial:
        'Substance in the material: amount times content. The share given by bioavailability reaches the blood.',
      active: 'Active content',
      preparationNote: 'About the preparation',
      categories: {
        everyday: 'Everyday',
        sleep: 'Sleep',
        adhd: 'ADHD',
        wakefulness: 'Wakefulness',
        pain: 'Pain and colds',
        allergy: 'Allergy',
        stomach: 'Stomach',
        nutrients: 'Nutrients',
        cannabis: 'Cannabis',
        psychedelics: 'Psychedelics',
        mood: 'Mood and mind',
        nootropics: 'Nootropics',
        herbal: 'Herbal',
        performance: 'Performance',
      },
      dose: 'Amount taken',
      unit: 'Unit',
      hours: 'Hours since taking it',
      hoursHint: 'Half hours work too, for example 7.5.',
      interval: 'Taken every ... hours',
      intervalHint:
        'Only fill this in for regular use. The page then also shows how much builds up.',
      remaining: 'Still in the body',
      remainingOf: 'of {dose} {unit}',
      percent: 'Share of the dose',
      halfLife: 'Half-life',
      halfRange: 'usual range {low} to {high} h',
      halfHint:
        'The calculation uses the typical adult value. Liver, kidneys, genes, other medicines and age shift it.',
      times: 'Points in time',
      t50: 'Half left',
      t25: 'A quarter left',
      t10: 'A tenth left',
      t97: 'Practically cleared',
      t97Hint: 'After five half-lives about 97 percent is gone.',
      chart: 'Decay curve with the current hour as a dot',
      chartHint: 'Move over the curve or tap it to read a point in time. The arrow keys work too.',
      chartAt: 'After {time}: {percent} percent left',
      now: 'Now',
      repeatedTitle: 'With regular use',
      accumulation: 'Accumulation factor',
      accumulationHint:
        'Taking more before the previous amount has cleared builds up. Steady state is reached after about five half-lives.',
      steadyPeak: 'Peak at steady state',
      steadyTrough: 'Trough at steady state',
      reference: 'About the substance',
      referenceHint:
        'Typical adult values from product information and pharmacological reviews. Detection times are ranges from the literature and cannot be converted to one person: they depend on dose, how long it was used, the test method and its cut-off.',
      metabolites: 'Metabolites',
      blood: 'Detection in blood',
      urine: 'Detection in urine',
      substanceNote: 'Worth knowing',
      noModel:
        'No half-life has been measured in humans for this substance, so the page shows no decay curve. The course of the effect and the information below still apply.',
      duration: { minutes: 'min', hours: 'h', days: 'days' },
      stepHalf: 'The calculator uses the typical half-life of {half} hours.',
      stepRemaining:
        'Remaining amount: dose times 0.5 to the power of (time divided by half-life).',
      stepTimes:
        'The points in time follow from the same formula solved for time: half-life times the logarithm to base 2.',
      stepAccumulation:
        'Build-up with regular use: 1 divided by (1 minus 0.5 to the power of (interval divided by half-life)).',
      disclaimer:
        'Not medical advice and not an encouragement to use anything. The calculator estimates arithmetically how much of a dose is still in the body after a given time, using a simplified model with a single half-life. It replaces no measurement, predicts no effect, and can determine neither fitness to drive nor the result of a test at a given moment.',
    },
    peptide: {
      mode: 'Application',
      modes: { syringe: 'Syringe', spray: 'Nasal spray' },
      sprayVolume: 'Spray volume in microlitres',
      sprayVolumeHint:
        'Amount one actuation delivers. Common nasal pumps deliver 50 to 140 microlitres, and the figure is usually printed on the pump.',
      sprayPicture: 'Drawing of a nasal spray bottle with the dose as the lighter part',
      sprayPictureHint:
        'The lighter part at the top is the volume of one dose, the darker rest stays in the bottle. Each dot below is one actuation.',
      sprayDose: 'Dose',
      sprayVial: 'Bottle',
      sprays: 'actuations',
      drawSpray: 'To spray',
      perSpray: 'Per actuation',
      spraysPerVial: 'Actuations per vial',
      columnSprays: 'Actuations',
      stepSpray:
        'Concentration times the spray volume gives the amount per actuation, and the amount to draw divided by it gives the number of actuations.',
      vial: 'Peptide in the vial in mg',
      vialHint: 'Printed on the label, for example 5 mg.',
      solvent: 'Solvent in ml',
      solventHint: 'Amount you add to the vial.',
      dose: 'Amount to draw',
      unit: 'Unit',
      units: { mcg: 'mcg', mg: 'mg' },
      syringe: 'Insulin syringe',
      scales: { u100: 'U-100', u40: 'U-40' },
      scaleHint:
        'U-100 means 100 units per ml, U-40 means 40 units per ml. The scale is printed on the syringe.',
      size: 'Size',
      sizeOption: '{ml} ml, {units} units',
      draw: 'Draw up',
      drawUnit: 'units',
      volume: 'Volume',
      concentration: 'Concentration',
      mcgPerUnit: 'Per unit',
      coverage: 'Vial covers',
      coverageValue: '{whole} full draws',
      rest: 'Left in the vial',
      alternatives: 'Other solvent amounts',
      alternativesHint:
        'The same amount drawn with a different water volume. Values between 2 units and the capacity of the syringe are the easiest to read.',
      columnSolvent: 'Solvent',
      columnConcentration: 'Concentration',
      columnUnits: 'Units',
      columnFits: 'Readable',
      fits: 'Good',
      unsuitable: 'Awkward',
      current: 'Current choice',
      overCapacity:
        'The amount does not fit the chosen syringe. Use a larger syringe or less solvent.',
      tooSmall:
        'Below two units the scale can hardly be read accurately. More solvent makes the value larger.',
      stepConcentration: 'Peptide divided by solvent gives the concentration in mg per ml.',
      stepDose: 'The amount to draw is converted to mcg.',
      stepVolume: 'Amount divided by concentration gives the volume in ml.',
      stepUnits: 'Volume times {unitsPerMl} units per ml gives the units on the scale.',
      stepCoverage: 'Total amount in the vial divided by the amount drawn gives the coverage.',
      disclaimer:
        'The calculator works out concentration and volume mathematically for laboratory and analysis purposes. It gives no individual dosing or usage recommendation.',
    },
  },
}
