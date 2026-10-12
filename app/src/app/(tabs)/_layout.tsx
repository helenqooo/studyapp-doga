import { Tabs } from 'expo-router/js-tabs';
import { Icon, type IconName } from '../../components/Icon';
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
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.tabActive,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarStyle: { backgroundColor: theme.colors.tabBar, borderTopColor: theme.colors.border },
        tabBarLabelStyle: { fontSize: theme.fontSize.xs, fontWeight: theme.fontWeight.semibold },
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
