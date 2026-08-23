import type { StaffRole, Guest, Prisma } from "@prisma/client";

export type GuestListItem = Prisma.GuestGetPayload<{
  include: { table: true; invitation: { include: { checkIns: true } } };
}>;

export type TableWithOccupancy = {
  id: string;
  number: number;
  name: string | null;
  occupied: number;
  capacity: number;
  remaining: number;
  guests: Guest[];
};

export type SessionContext = {
  userId: string;
  email: string;
  name: string;
  weddingId: string;
  weddingLabel: string;
  role: StaffRole;
};

export type ScanOutcome = {
  result: "VALID" | "ALREADY_USED" | "INVALID" | "DISABLED";
  guestName?: string;
  firstScanAt?: string;
  scannedAt?: string;
};

export type DashboardStats = {
  totalGuests: number;
  invitationsGenerated: number;
  invitationsViewed: number;
  present: number;
  awaited: number;
  lastCheckIn: { guestName: string; scannedAt: string } | null;
};
