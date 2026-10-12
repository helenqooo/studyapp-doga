import { Tabs } from 'expo-router/js-tabs';
import { Icon, type IconName } from '../../components/Icon';
import { useWindowLayout } from '../../lib/layout';
import { useTheme } from '../../theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Ana Sayfa', icon: 'house.fill' },
  { name: 'solve', title: 'Çöz', icon: 'camera.fill' },
  { name: 'review', title: 'Tekrar', icon: 'arrow.triangle.2.circlepath' },
  { name: 'exams', title: 'Deneme', icon: 'chart.bar.fill' },
  { name: 'profile', title: 'Profil', icon: 'person.crop.circle.fill' },
];

export default function TabsLayout() {
  const theme = useTheme();
  // Large windows (iPad landscape, 13" portrait) get a sidebar instead of bottom tabs.
  const { sidebar } = useWindowLayout();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: sidebar ? 'left' : 'bottom',
        tabBarVariant: 'uikit',
        tabBarActiveTintColor: theme.colors.tabActive,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarActiveBackgroundColor: sidebar ? theme.colors.primarySoft : undefined,
        tabBarStyle: sidebar
          ? // The navigator defaults to a 360pt Material sidebar (minWidth); keep it slimmer.
            { width: theme.layout.sidebarWidth, minWidth: theme.layout.sidebarWidth, backgroundColor: theme.colors.tabBar, borderRightColor: theme.colors.border, paddingTop: theme.spacing.xl }
          : { backgroundColor: theme.colors.tabBar, borderTopColor: theme.colors.border },
        tabBarItemStyle: sidebar ? { borderRadius: theme.radius.md, marginHorizontal: theme.spacing.sm } : undefined,
        tabBarLabelStyle: { fontSize: sidebar ? theme.fontSize.md : theme.fontSize.xs, fontWeight: theme.fontWeight.semibold },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => <Icon name={tab.icon} color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
