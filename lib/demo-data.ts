export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}

export function getDemoChatMessages(firstName: string) {
  return [
    {
      role: "assistant" as const,
      content: `Hallo ${firstName}! Ich habe Zugriff auf alle deine medizinischen Dokumente. Frag mich etwas — z. B. warum du ein bestimmtes Medikament bekommst.`,
    },
  ];
}

export const demoChatResponses: Record<string, string> = {
  default:
    "Ich finde dazu noch keine passenden Dokumente in deinem Konto. Lade zuerst einen Arztbrief oder Laborbefund hoch — dann kann ich dir eine persönliche Antwort geben.",
  medikament:
    "Ich finde in deinen Dokumenten noch keine Medikamenten-Empfehlung. Sobald du einen Arztbrief hochlädst, kann ich dir erklären, warum ein Medikament verschrieben wurde.",
};

export const emptyAiSummary =
  "Lade dein erstes medizinisches Dokument hoch. Danach erstellt die KI automatisch eine persönliche Zusammenfassung — nur für dich und nur aus deinen Daten.";
