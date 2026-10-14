import { Redirect, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { AppText } from '../components/AppText';
import { Mascot, type MascotMood } from '../components/mascot/Mascot';
import { POSES } from '../components/mascot/poses';
import { useTheme } from '../theme';

// Dev-only contact sheet of Lumi: every mood side by side (one viewport, for screenshots),
// then the wardrobe and the small sizes. `?still=1` draws the single-SVG still Lumi instead
// of the layered live one. Production builds go home.

const MOODS = Object.keys(POSES) as MascotMood[];
const CELL = 112;
const SMALL = [32, 44, 64];

export default function DevLumiSheet() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Sheet />;
}

function Sheet() {
  const theme = useTheme();
  const still = useLocalSearchParams<{ still?: string }>().still === '1';
  const cell = (key: string, label: string, child: ReactNode) => (
    <View key={key} style={{ width: CELL, alignItems: 'center', gap: theme.spacing.xs }}>
      {child}
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </View>
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {MOODS.map((m) => cell(m, m, <Mascot mood={m} size={CELL - 16} still={still} enter={false} interactive={false} outfit={null} />))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'flex-end' }}>
        {cell('glasses', 'glasses', <Mascot size={CELL - 16} still={still} enter={false} interactive={false} outfit={{ head: null, face: 'glasses' }} />)}
        {cell('party', 'party', <Mascot size={CELL - 16} still={still} enter={false} interactive={false} outfit={{ head: 'party', face: null }} />)}
        {cell('crown', 'crown', <Mascot size={CELL - 16} still={still} enter={false} interactive={false} outfit={{ head: 'crown', face: null }} />)}
        {cell('headphones', 'headphones', <Mascot size={CELL - 16} still={still} enter={false} interactive={false} outfit={{ head: 'headphones', face: 'glasses' }} />)}
        {cell('marker', 'fly + marker', <Mascot mood="fly" size={CELL - 16} still={still} enter={false} interactive={false} outfit={null} held="marker" />)}
        {cell('left', 'facing left', <Mascot mood="wave" size={CELL - 16} still={still} enter={false} interactive={false} outfit={null} facing="left" />)}
        {SMALL.map((s) => cell(`s${s}`, `${s} pt`, <Mascot size={s} still={still} enter={false} interactive={false} outfit={null} />))}
      </View>
    </ScrollView>
  );
}
