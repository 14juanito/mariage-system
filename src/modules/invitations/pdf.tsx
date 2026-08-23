import "server-only";
import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Font,
  StyleSheet,
  renderToBuffer,
  Svg,
  Path,
} from "@react-pdf/renderer";
import { generateQrPngBuffer } from "./qr";
import { formatDateFr } from "@/lib/utils";
import { guestDisplayName, guestDisplayNameStylized, guestSalutation } from "@/lib/guest";
import type { Civility, PartyType } from "@prisma/client";

const FONTS_DIR = path.join(process.cwd(), "src/assets/fonts");

let fontsRegistered = false;
function registerFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "Cormorant Garamond",
    fonts: [
      { src: path.join(FONTS_DIR, "CormorantGaramond-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONTS_DIR, "CormorantGaramond-Medium.ttf"), fontWeight: 500 },
      { src: path.join(FONTS_DIR, "CormorantGaramond-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(FONTS_DIR, "CormorantGaramond-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(FONTS_DIR, "Inter-Regular.ttf"), fontWeight: 400 },
      { src: path.join(FONTS_DIR, "Inter-Medium.ttf"), fontWeight: 500 },
      { src: path.join(FONTS_DIR, "Inter-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(FONTS_DIR, "Inter-Bold.ttf"), fontWeight: 700 },
    ],
  });
  fontsRegistered = true;
}

const COLORS = {
  eucalyptus: "#29483B",
  sage: "#7F927D",
  softSage: "#B8C8B5",
  ivory: "#F6F3EA",
  beige: "#D8CCB8",
  champagne: "#C9B995",
  textPrimary: "#26322B",
  textSecondary: "#5C6B60",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.ivory,
    fontFamily: "Inter",
    padding: 0,
  },
  // Cadre à double liseré façon papeterie premium : un trait champagne
  // généreux, et un trait eucalyptus plus fin juste à l'intérieur.
  frameOuter: {
    position: "absolute",
    top: 22,
    left: 22,
    right: 22,
    bottom: 22,
    borderWidth: 1.2,
    borderColor: COLORS.champagne,
  },
  frameInner: {
    position: "absolute",
    top: 28,
    left: 28,
    right: 28,
    bottom: 28,
    borderWidth: 0.6,
    borderColor: COLORS.softSage,
  },
  content: {
    flex: 1,
    paddingTop: 68,
    paddingBottom: 44,
    paddingHorizontal: 56,
    alignItems: "center",
  },
  eyebrow: {
    fontFamily: "Inter",
    fontSize: 9,
    letterSpacing: 3,
    color: COLORS.sage,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  namesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  brideGroomName: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 600,
    fontSize: 34,
    color: COLORS.eucalyptus,
  },
  ampersand: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 500,
    fontSize: 26,
    color: COLORS.champagne,
    marginHorizontal: 14,
  },
  divider: {
    width: 56,
    height: 1,
    backgroundColor: COLORS.champagne,
    marginVertical: 20,
  },
  invitedLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  guestName: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 700,
    fontSize: 26,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 22,
  },
  message: {
    fontSize: 11,
    lineHeight: 1.7,
    color: COLORS.textSecondary,
    textAlign: "center",
    maxWidth: 340,
    marginBottom: 28,
  },
  detailsCard: {
    width: "100%",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.softSage,
    paddingVertical: 18,
    marginBottom: 26,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: COLORS.sage,
    textTransform: "uppercase",
    width: 60,
    textAlign: "right",
    marginRight: 12,
  },
  detailValue: {
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: 500,
    flex: 1,
  },
  qrWrap: {
    alignItems: "center",
    marginTop: "auto",
  },
  qrCard: {
    position: "relative",
    padding: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.softSage,
    marginBottom: 10,
  },
  qrCorner: {
    position: "absolute",
    width: 13,
    height: 13,
    borderColor: COLORS.champagne,
  },
  qrImage: {
    width: 96,
    height: 96,
  },
  qrHint: {
    fontSize: 8,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  qrFallbackCode: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: 9,
    letterSpacing: 2,
    color: COLORS.eucalyptus,
  },
  footerRule: {
    position: "absolute",
    bottom: 46,
    left: "38%",
    right: "38%",
    height: 0.6,
    backgroundColor: COLORS.softSage,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 7.5,
    color: COLORS.sage,
    letterSpacing: 2,
  },
});

/** Ornement botanique réutilisé aux 4 coins, mis en miroir via `transform`. */
function CornerOrnament({ style, transform }: { style: object; transform?: string }) {
  return (
    <Svg width={110} height={72} style={{ position: "absolute", ...style, transform }} viewBox="0 0 110 72">
      <Path
        d="M8 64 C 18 36, 36 18, 64 8 M16 54 C 26 40, 40 30, 54 24 M24 44 C 32 37, 42 31, 52 27"
        stroke={COLORS.softSage}
        strokeWidth={1.3}
        fill="none"
      />
    </Svg>
  );
}

function QrCorner({ top, left, right, bottom }: { top?: number; left?: number; right?: number; bottom?: number }) {
  return (
    <View
      style={[
        styles.qrCorner,
        {
          top,
          left,
          right,
          bottom,
          borderTopWidth: top !== undefined ? 2 : 0,
          borderBottomWidth: bottom !== undefined ? 2 : 0,
          borderLeftWidth: left !== undefined ? 2 : 0,
          borderRightWidth: right !== undefined ? 2 : 0,
        },
      ]}
    />
  );
}

export type InvitationPdfData = {
  brideName: string;
  groomName: string;
  guestFirstName: string;
  guestLastName: string;
  guestCivility: Civility | null;
  guestPartyType: PartyType;
  weddingDate: Date;
  weddingTime: string;
  venueName: string;
  venueAddress: string;
  welcomeMessage: string;
  tableNumber?: number | null;
  tableName?: string | null;
  token: string;
};

function InvitationDocument({ data, qrPngBase64 }: { data: InvitationPdfData; qrPngBase64: string }) {
  const nameParts = {
    civility: data.guestCivility,
    partyType: data.guestPartyType,
    firstName: data.guestFirstName,
    lastName: data.guestLastName,
  };
  const guestName = guestDisplayName(nameParts);
  const { prefix: namePrefix, emphasized: nameEmphasized } = guestDisplayNameStylized(nameParts);
  const salutation = guestSalutation(nameParts);
  const fallbackCode = data.token.slice(0, 8).toUpperCase();

  return (
    <Document title={`Invitation — ${guestName}`} author={`${data.brideName} & ${data.groomName}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.frameOuter} />
        <View style={styles.frameInner} />

        {/* Feuillage décoratif dans les 4 coins — sobre, pas de surcharge. */}
        <CornerOrnament style={{ top: 36, left: 36 }} />
        <CornerOrnament style={{ top: 36, right: 36 }} transform="scaleX(-1)" />
        <CornerOrnament style={{ bottom: 36, left: 36 }} transform="scaleY(-1)" />
        <CornerOrnament style={{ bottom: 36, right: 36 }} transform="scale(-1, -1)" />

        <View style={styles.content}>
          <Text style={styles.eyebrow}>Vous êtes convié·e au mariage de</Text>
          <View style={styles.namesRow}>
            <Text style={styles.brideGroomName}>{data.brideName}</Text>
            <Text style={styles.ampersand}>&</Text>
            <Text style={styles.brideGroomName}>{data.groomName}</Text>
          </View>
          <View style={styles.divider} />

          <Text style={styles.invitedLabel}>{salutation}</Text>
          <Text style={styles.guestName}>
            {namePrefix ? `${namePrefix} ` : ""}
            {nameEmphasized}
          </Text>
          <Text style={styles.message}>{data.welcomeMessage}</Text>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDateFr(data.weddingDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Heure</Text>
              <Text style={styles.detailValue}>{data.weddingTime}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lieu</Text>
              <Text style={styles.detailValue}>{data.venueName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Adresse</Text>
              <Text style={styles.detailValue}>{data.venueAddress}</Text>
            </View>
            {data.tableNumber ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Table</Text>
                <Text style={styles.detailValue}>
                  N°{data.tableNumber}
                  {data.tableName ? ` — ${data.tableName}` : ""}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.qrWrap}>
            <View style={styles.qrCard}>
              <QrCorner top={-1} left={-1} />
              <QrCorner top={-1} right={-1} />
              <QrCorner bottom={-1} left={-1} />
              <QrCorner bottom={-1} right={-1} />
              {/* @react-pdf/renderer <Image> n'est pas une balise <img> HTML — pas d'attribut alt applicable. */}
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={qrPngBase64} style={styles.qrImage} />
            </View>
            <Text style={styles.qrHint}>Présentez ce QR code à l&apos;accueil</Text>
            <Text style={styles.qrFallbackCode}>{fallbackCode}</Text>
          </View>
        </View>

        <View style={styles.footerRule} />
        <Text style={styles.footer}>UNE INVITATION · UNE ENTRÉE</Text>
      </Page>
    </Document>
  );
}

export async function renderInvitationPdf(data: InvitationPdfData): Promise<Buffer> {
  registerFonts();
  const qrBuffer = await generateQrPngBuffer(data.token);
  const qrPngBase64 = `data:image/png;base64,${qrBuffer.toString("base64")}`;
  const buffer = await renderToBuffer(<InvitationDocument data={data} qrPngBase64={qrPngBase64} />);
  return buffer;
}
