import { Tabs } from 'expo-router/js-tabs';
import { Icon, type IconName } from '../../components/Icon';
import { useWindowLayout } from '../../lib/layout';
import { font, useTheme } from '../../theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Ana Sayfa', icon: 'house' },
  { name: 'solve', title: 'Çöz', icon: 'camera' },
  { name: 'review', title: 'Tekrar', icon: 'repeat' },
  { name: 'exams', title: 'Deneme', icon: 'chart-column' },
  { name: 'profile', title: 'Profil', icon: 'circle-user' },
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
        // Poppins has tall ascenders; a tight line height keeps the label inside the 49pt bar.
        tabBarLabelStyle: sidebar
          ? { fontSize: theme.fontSize.md, ...font('sans', 'medium') }
          : { fontSize: theme.fontSize.xs, lineHeight: theme.fontSize.xs + theme.spacing.xxs, ...font('sans', 'medium') },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            // Bottom bar: a slightly smaller icon leaves room for the label in the 49pt bar.
            tabBarIcon: ({ color, size }) => <Icon name={tab.icon} color={color} size={sidebar ? size : theme.layout.iconSize.md} />,
          }}
        />
      ))}
    </Tabs>
  );
}
