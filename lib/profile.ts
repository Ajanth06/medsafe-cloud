export function splitFullName(fullName: string | null | undefined) {
  if (!fullName?.trim()) {
    return { firstName: "", lastName: "" };
  }

  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function buildFullName(firstName: string, lastName: string) {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}
