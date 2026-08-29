import "server-only";
import path from "path";
import fs from "fs";
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
  Circle,
  Ellipse,
} from "@react-pdf/renderer";
import { generateQrPngBuffer } from "./qr";
import { formatDatePoster } from "@/lib/utils";
import { guestDisplayName, guestDisplayNameStylized, guestSalutation } from "@/lib/guest";
import type { Civility, PartyType } from "@prisma/client";

const FONTS_DIR = path.join(process.cwd(), "src/assets/fonts");
const IMAGES_DIR = path.join(process.cwd(), "src/assets/images");

// Fond fourni par le porteur de projet (cadre doré + fleurs noir/or déjà
// dessinées) — lu une fois puis mis en cache en base64 pour les rendus
// suivants, comme le buffer QR.
let backgroundImageBase64: string | null = null;
function getBackgroundImage() {
  if (!backgroundImageBase64) {
    const buffer = fs.readFileSync(path.join(IMAGES_DIR, "fond-invitation.jpg"));
    backgroundImageBase64 = `data:image/jpeg;base64,${buffer.toString("base64")}`;
  }
  return backgroundImageBase64;
}

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
      { src: path.join(FONTS_DIR, "CormorantGaramond-Italic.ttf"), fontWeight: 500, fontStyle: "italic" },
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
  Font.register({
    family: "Great Vibes",
    fonts: [{ src: path.join(FONTS_DIR, "GreatVibes-Regular.ttf"), fontWeight: 400 }],
  });
  fontsRegistered = true;
}

// Papeterie de mariage « noir & or » — fond noir profond, dorure métallique,
// calligraphie ivoire. Remplace la précédente charte sage/ivoire pour le PDF
// et la page publique uniquement (le back-office admin garde sage/ivoire).
const COLORS = {
  black: "#0B0B0C",
  charcoal: "#221F1B",
  anthracite: "#3A3733",
  ivory: "#F4EFE2",
  ivoryDim: "#C9C3B4",
  goldLight: "#EFD9A0",
  gold: "#C9A24B",
  goldDeep: "#8A6A28",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.black,
    fontFamily: "Cormorant Garamond",
    padding: 0,
  },
  // Cadre + fleurs fournis par le porteur de projet — image plein cadre,
  // le texte est ensuite superposé dans la zone noire centrale laissée libre.
  // L'Image est nichée dans une View absolue (et non absolue elle-même) car
  // @react-pdf/renderer calcule mal la hauteur d'un <Image> en position
  // absolue lors de la pagination ("Node of type IMAGE can't wrap between
  // pages…"), ce qui provoquait un PDF de 3 pages au lieu d'une.
  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 595.28,
    height: 841.89,
  },
  content: {
    flex: 1,
    paddingTop: 66,
    paddingBottom: 36,
    paddingHorizontal: 84,
    alignItems: "center",
  },
  namesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 58,
    marginBottom: 4,
  },
  brideGroomName: {
    fontFamily: "Great Vibes",
    fontSize: 44,
    color: COLORS.ivory,
    lineHeight: 1,
  },
  ampersandWrap: {
    alignItems: "center",
    marginHorizontal: 12,
  },
  ampersand: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 600,
    fontSize: 24,
    color: COLORS.gold,
  },
  ornamentWrap: {
    alignItems: "center",
    marginTop: 14,
    marginBottom: 16,
  },
  invitedLabel: {
    fontFamily: "Cormorant Garamond",
    fontSize: 10,
    letterSpacing: 2.5,
    color: COLORS.gold,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  guestName: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 600,
    fontSize: 21,
    color: COLORS.ivory,
    textAlign: "center",
    marginBottom: 18,
  },
  dateLine: {
    textAlign: "center",
    marginBottom: 8,
  },
  dateLineWord: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 600,
    fontSize: 15,
    color: COLORS.ivory,
  },
  dateLineDay: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 700,
    fontSize: 30,
    color: COLORS.gold,
  },
  weddingTime: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: 1.5,
    color: COLORS.ivory,
  },
  message: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 500,
    fontStyle: "italic",
    fontSize: 14.5,
    lineHeight: 1.5,
    color: COLORS.ivoryDim,
    textAlign: "center",
    maxWidth: 360,
    marginTop: 10,
    marginBottom: 4,
  },
  infoBlock: {
    alignItems: "center",
    marginTop: 14,
    marginBottom: 4,
  },
  infoLine: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 500,
    fontSize: 13,
    letterSpacing: 0.5,
    color: COLORS.ivory,
    textAlign: "center",
    marginBottom: 5,
  },
  infoLineDim: {
    fontFamily: "Cormorant Garamond",
    fontSize: 11.5,
    color: COLORS.ivoryDim,
    textAlign: "center",
    marginBottom: 5,
  },
  infoLineTable: {
    fontFamily: "Cormorant Garamond",
    fontWeight: 600,
    fontSize: 15.5,
    letterSpacing: 0.5,
    color: COLORS.gold,
    textAlign: "center",
    marginTop: 3,
  },
  ringsWrap: {
    alignItems: "center",
    marginTop: "auto",
    marginBottom: 8,
  },
  qrCard: {
    position: "relative",
    padding: 12,
    backgroundColor: COLORS.charcoal,
    borderWidth: 0.75,
    borderColor: COLORS.gold,
    marginBottom: 9,
  },
  qrCorner: {
    position: "absolute",
    width: 14,
    height: 14,
    borderColor: COLORS.goldLight,
  },
  qrImage: {
    width: 108,
    height: 108,
  },
  qrHint: {
    fontFamily: "Cormorant Garamond",
    fontSize: 8,
    color: COLORS.ivoryDim,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  qrFallbackCode: {
    fontFamily: "Inter",
    fontWeight: 600,
    fontSize: 8.5,
    letterSpacing: 2,
    color: COLORS.gold,
  },
  footerRule: {
    position: "absolute",
    bottom: 44,
    left: "36%",
    right: "36%",
    height: 0.6,
    backgroundColor: COLORS.goldDeep,
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: "Cormorant Garamond",
    fontWeight: 600,
    fontSize: 7.5,
    color: COLORS.gold,
    letterSpacing: 2.5,
  },
});

/** Ornement Art déco horizontal — losange central flanqué de volutes symétriques. */
function ArtDecoDivider() {
  return (
    <Svg width={220} height={20} viewBox="0 0 220 20">
      <Path d="M0 10 H88 M132 10 H220" stroke={COLORS.goldDeep} strokeWidth={0.9} />
      <Path
        d="M110 2 L118 10 L110 18 L102 10 Z"
        stroke={COLORS.gold}
        strokeWidth={0.9}
        fill="none"
      />
      <Circle cx={110} cy={10} r={2} fill={COLORS.gold} />
      <Path d="M88 10 C 94 6, 100 6, 102 10 M118 10 C 120 6, 126 6, 132 10" stroke={COLORS.gold} strokeWidth={0.8} fill="none" />
    </Svg>
  );
}

/**
 * Alliances entrelacées, rendu vectoriel doré (pas de photo — voir plus
 * haut). Un trait fin plus clair en vis-à-vis de chaque anneau simule un
 * reflet métallique, et deux étincelles ponctuent l'ensemble pour un rendu
 * plus « bijou » que deux simples cercles.
 */
function RingsOrnament() {
  return (
    <Svg width={92} height={56} viewBox="0 0 92 56">
      <Ellipse cx={34} cy={28} rx={19} ry={19} stroke={COLORS.goldDeep} strokeWidth={3} fill="none" />
      <Ellipse cx={34} cy={28} rx={19} ry={19} stroke={COLORS.goldLight} strokeWidth={0.9} fill="none" />
      <Path d="M22 17 A 19 19 0 0 1 42 13" stroke={COLORS.goldLight} strokeWidth={1.4} fill="none" />

      <Ellipse cx={58} cy={28} rx={19} ry={19} stroke={COLORS.goldDeep} strokeWidth={3} fill="none" />
      <Ellipse cx={58} cy={28} rx={19} ry={19} stroke={COLORS.goldLight} strokeWidth={0.9} fill="none" />
      <Path d="M46 17 A 19 19 0 0 1 66 13" stroke={COLORS.goldLight} strokeWidth={1.4} fill="none" />

      <Path d="M78 12 L79.4 15.6 L83 17 L79.4 18.4 L78 22 L76.6 18.4 L73 17 L76.6 15.6 Z" fill={COLORS.goldLight} />
      <Path d="M12 40 L12.9 42.2 L15 43 L12.9 43.8 L12 46 L11.1 43.8 L9 43 L11.1 42.2 Z" fill={COLORS.goldLight} />
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
          borderTopWidth: top !== undefined ? 1.5 : 0,
          borderBottomWidth: bottom !== undefined ? 1.5 : 0,
          borderLeftWidth: left !== undefined ? 1.5 : 0,
          borderRightWidth: right !== undefined ? 1.5 : 0,
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

function InvitationDocument({
  data,
  qrPngBase64,
  backgroundImage,
}: {
  data: InvitationPdfData;
  qrPngBase64: string;
  backgroundImage: string;
}) {
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
  const { month, day, weekday } = formatDatePoster(data.weddingDate);

  return (
    <Document title={`Invitation — ${guestName}`} author={`${data.brideName} & ${data.groomName}`}>
      <Page size="A4" style={styles.page}>
        {/* `fixed` sort l'image du calcul de pagination de @react-pdf/renderer
            (prévu pour les fonds/en-têtes répétés) — sans lui, une <Image>
            en position absolue était mal mesurée et faisait déborder le
            document sur 2-3 pages au lieu d'une seule. */}
        {/* @react-pdf/renderer <Image> n'est pas une balise <img> HTML — pas d'attribut alt applicable. */}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={backgroundImage} style={styles.bgImage} fixed />

        <View style={styles.content}>
          <View style={styles.namesRow}>
            <Text style={styles.brideGroomName}>{data.brideName}</Text>
            <View style={styles.ampersandWrap}>
              <Text style={styles.ampersand}>&amp;</Text>
            </View>
            <Text style={styles.brideGroomName}>{data.groomName}</Text>
          </View>

          <View style={styles.ornamentWrap}>
            <ArtDecoDivider />
          </View>

          <Text style={styles.invitedLabel}>{salutation}</Text>
          <Text style={styles.guestName}>
            {namePrefix ? `${namePrefix} ` : ""}
            {nameEmphasized}
          </Text>

          <Text style={styles.dateLine}>
            <Text style={styles.dateLineWord}>{weekday} </Text>
            <Text style={styles.dateLineDay}>{day} </Text>
            <Text style={styles.dateLineWord}>{month}</Text> 
          </Text>
          <Text style={styles.weddingTime}>{data.weddingTime}</Text>

          <View style={styles.ornamentWrap}>
            <ArtDecoDivider />
          </View>

          <Text style={styles.message}>{data.welcomeMessage}</Text>

          <View style={styles.infoBlock}>
            <Text style={styles.infoLine}>{data.venueName}</Text>
            <Text style={styles.infoLineDim}>{data.venueAddress}</Text>
            {data.tableNumber ? (
              <Text style={styles.infoLineTable}>
                Table N°{data.tableNumber}
                {data.tableName ? ` — ${data.tableName}` : ""}
              </Text>
            ) : null}
          </View>

          <View style={styles.ringsWrap}>
            <RingsOrnament />
          </View>

          <View style={{ alignItems: "center" }}>
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

        {/* `fixed` (même raison que le fond) : évite que ces éléments en
            position absolue ne soient mal comptés dans la pagination. */}
        <View style={styles.footerRule} fixed />
        <Text style={styles.footer} fixed>
          UNE INVITATION · UNE ENTRÉE
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvitationPdf(data: InvitationPdfData): Promise<Buffer> {
  registerFonts();
  const qrBuffer = await generateQrPngBuffer(data.token);
  const qrPngBase64 = `data:image/png;base64,${qrBuffer.toString("base64")}`;
  const backgroundImage = getBackgroundImage();
  const buffer = await renderToBuffer(
    <InvitationDocument data={data} qrPngBase64={qrPngBase64} backgroundImage={backgroundImage} />,
  );
  return buffer;
}
