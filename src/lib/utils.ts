import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function formatDateFr(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function formatTimeFr(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Découpage « jour de semaine / jour / mois » pour la mise en avant type
 * papeterie (le numéro du jour est affiché en plus grand au milieu de la
 * ligne — ex. « Samedi 3 Octobre »), chaque mot avec une majuscule initiale.
 */
export function formatDatePoster(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const month = capitalize(new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(d));
  const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric" }).format(d);
  const weekday = capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(d));
  return { month, day, weekday };
}
