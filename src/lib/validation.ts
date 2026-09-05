import { z } from "zod";

export const loginSchema = z.object({
  // La casse est normalisée ici, et non à l'appel : la recherche du compte se
  // fait par `findUnique` sur une colonne unique, donc sensible à la casse en
  // PostgreSQL. Sans cela, un compte enregistré en minuscules devient
  // introuvable dès que le clavier d'un téléphone met la première lettre en
  // majuscule — et l'échec est indiscernable d'un mauvais mot de passe.
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const guestSchema = z
  .object({
    // En mode Couple, le champ civilité n'est pas rendu dans le formulaire :
    // FormData.get() renvoie alors `null` (pas juste une chaîne vide), d'où
    // le `nullable()` en plus de `optional()`.
    civility: z
      .union([z.literal("MR"), z.literal("MME"), z.literal("")])
      .nullable()
      .optional()
      .transform((v) => (v ? v : undefined)),
    partyType: z.enum(["SINGLE", "COUPLE"]).default("SINGLE"),
    // Pour un couple, ce champ reçoit le nom du couple (ex. « Mbaya ») — voir superRefine ci-dessous.
    firstName: z.string().trim().max(80).optional().default(""),
    lastName: z.string().trim().min(1, "Le nom est requis").max(80),
    phone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    email: z
      .string()
      .trim()
      .email("E-mail invalide")
      .max(150)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    tableId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    notes: z
      .string()
      .trim()
      .max(1000)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
  })
  .superRefine((data, ctx) => {
    if (data.partyType === "SINGLE" && !data.firstName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["firstName"], message: "Le prénom est requis" });
    }
  });

export const tableSchema = z.object({
  number: z.coerce.number().int().min(1, "Numéro invalide").max(999),
  name: z
    .string()
    .trim()
    .max(80)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export const weddingSchema = z.object({
  brideName: z.string().trim().min(1, "Requis").max(120),
  groomName: z.string().trim().min(1, "Requis").max(120),
  weddingDate: z.string().min(1, "Requis"),
  weddingTime: z.string().min(1, "Requis"),
  venueName: z.string().trim().min(1, "Requis").max(200),
  venueAddress: z.string().trim().min(1, "Requis").max(300),
  welcomeMessage: z.string().trim().min(1, "Requis").max(2000),
});

export const resetCheckInSchema = z.object({
  invitationId: z.string().uuid(),
  reason: z.string().trim().min(5, "Merci de préciser un motif (5 caractères minimum)").max(500),
});

export const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Requis").max(120),
  // Même normalisation que `loginSchema` : un compte enregistré avec une
  // majuscule serait introuvable à la connexion, donc inutilisable, sans
  // aucun message permettant de le comprendre.
  email: z.string().trim().toLowerCase().email("E-mail invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  role: z.enum(["ADMIN", "CHECKIN"]),
});
