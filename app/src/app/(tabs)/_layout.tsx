import { Tabs } from 'expo-router/js-tabs';
import { useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReviewsToday } from '../../api/hooks';
import { Icon, type IconName } from '../../components/Icon';
import { OptikStrip, stripReserve } from '../../components/TabBar';
import { useTheme } from '../../theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Ana sayfa', icon: 'house' },
  { name: 'solve', title: 'Çöz', icon: 'camera' },
  { name: 'review', title: 'Tekrar', icon: 'repeat' },
  { name: 'exams', title: 'Deneme', icon: 'chart-column' },
  { name: 'profile', title: 'Profil', icon: 'circle-user' },
];

export default function TabsLayout() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Reviews waiting today sit on the Tekrar tab as a badge (0 lets the badge scale out).
  const due = useReviewsToday().data?.items.length ?? 0;
  // The strip floats over the scenes; this is only the first guess before it reports its height.
  const reserved = stripReserve(theme, width, insets.bottom);
  return (
    <Tabs
      tabBar={(props) => <OptikStrip {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: 'bottom',
        tabBarStyle: { height: reserved },
        ...(reduceMotion
          ? { animation: 'none' as const }
          : { animation: 'fade' as const, transitionSpec: { animation: 'timing' as const, config: { duration: theme.motion.tabs.fade } } }),
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused, size }) => <Icon name={tab.icon} color={color} size={size} duotone={focused} />,
            ...(tab.name === 'review'
              ? { tabBarBadge: due, tabBarAccessibilityLabel: due ? `${tab.title}, ${due} soru bekliyor` : tab.title }
              : {}),
          }}
        />
      ))}
    </Tabs>
  );
}
