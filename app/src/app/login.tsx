import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { useAuthConfig, useLogin, useRegister } from '../api/hooks';
import type { AvatarKey } from '../api/types';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { Kareli } from '../components/Kareli';
import { LOGO_DOT, LOGO_RING } from '../components/Logo';
import { Mascot } from '../components/mascot/Mascot';
import { ease } from '../components/motion/presets';
import { PressableScale } from '../components/motion/PressableScale';
import { SegmentedControl } from '../components/SegmentedControl';
import { TextField } from '../components/TextField';
import { APP_NAME, SLOGAN } from '../brand';
import { API_URL } from '../config';
import { haptics } from '../lib/haptics';
import { useWindowLayout } from '../lib/layout';
import { useTheme } from '../theme';


type Mode = 'login' | 'register';
const AVATARS: AvatarKey[] = ['clay', 'kraft', 'olive', 'sky', 'plum', 'sand', 'slate', 'rose'];
const AVATAR_NAMES: Record<AvatarKey, string> = {
  clay: 'kil',
  kraft: 'kahve',
  olive: 'zeytin',
  sky: 'gök',
  plum: 'erik',
  sand: 'kum',
  slate: 'gri',
  rose: 'gül',
};
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

/** The logo in two inks: the ring in `text`, the dot in fosfor. */
function TwoToneLogo({ size }: { size: number }) {
  const theme = useTheme();
  return (
    <Svg width={size} height={size} viewBox="13 13 74 74" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={LOGO_RING} fill="none" stroke={theme.colors.text} strokeWidth={theme.layout.logo.stroke} strokeLinecap="round" />
      <Circle {...LOGO_DOT} fill={theme.colors.accent} />
    </Svg>
  );
}

/** An optik `dot` bubble filled with an avatar color; the chosen one gets a graphite ring (cross-faded). */
function ColorDot({ color, selected, label, onPress }: { color: string; selected: boolean; label: string; onPress: () => void }) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const { touch } = useWindowLayout();
  const { w, h } = theme.layout.bubble.dot;
  const ringW = w + theme.layout.bubble.selectRing * 2;
  const ringH = h + theme.layout.bubble.selectRing * 2;
  const on = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(selected ? 1 : 0, {
      duration: reduceMotion ? theme.motion.duration.fast : theme.motion.duration.base,
      easing: ease('standard'),
      reduceMotion: ReduceMotion.Never,
    });
  }, [selected, on, reduceMotion, theme.motion.duration.fast, theme.motion.duration.base]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: on.value }));
  const sw = theme.layout.selectedBorder;
  return (
    <PressableScale
      kind="bubble"
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{ width: touch, height: touch, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={w} height={h}>
        <Ellipse cx={w / 2} cy={h / 2} rx={w / 2 - theme.layout.bubble.outline / 2} ry={h / 2 - theme.layout.bubble.outline / 2} fill={color} stroke={theme.colors.optik} strokeWidth={theme.layout.bubble.outline} />
      </Svg>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, ringStyle]}>
        <Svg width={ringW} height={ringH}>
          <Ellipse cx={ringW / 2} cy={ringH / 2} rx={ringW / 2 - sw / 2} ry={ringH / 2 - sw / 2} fill="none" stroke={theme.colors.mark} strokeWidth={sw} />
        </Svg>
      </Animated.View>
    </PressableScale>
  );
}

/** The brand side: a graph-paper patch with Lumi waving, the logo, the name and the slogan. */
function Hero({ size, patch }: { size: number; patch: boolean }) {
  const theme = useTheme();
  const content = (
    <View style={{ alignItems: 'center', gap: theme.spacing.sm, padding: patch ? theme.spacing.xl : 0 }}>
      <Mascot mood="wave" size={size} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <TwoToneLogo size={theme.layout.iconSize.xl} />
        <AppText variant="title">{APP_NAME}</AppText>
      </View>
      <AppText align="center" color="textMuted">
        {SLOGAN}
      </AppText>
    </View>
  );
  if (!patch) return content;
  return (
    <View
      style={{
        width: '100%',
        minHeight: theme.layout.login.patch,
        borderRadius: theme.radius.xl,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
        borderWidth: theme.layout.borderWidth,
        borderColor: theme.colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Kareli height={theme.layout.login.patch} fade={false} />
      </View>
      {content}
    </View>
  );
}

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { sizeClass, margin } = useWindowLayout();
  const config = useAuthConfig();
  const login = useLogin();
  const register = useRegister();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [avatar, setAvatar] = useState<AvatarKey>('clay');
  const [touched, setTouched] = useState(false);
  const displayNameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const wide = sizeClass === 'wide';
  const registering = mode === 'register';
  const busy = login.isPending || register.isPending;
  const name = username.trim().toLocaleLowerCase('en-US');
  const usernameOk = USERNAME_RE.test(name);
  const passwordOk = password.length >= 8;
  const formOk = registering ? usernameOk && passwordOk && displayName.trim().length > 0 : name.length > 0 && password.length > 0;
  const missing = touched && !registering && !(name.length > 0 && password.length > 0);
  const error = missing ? 'Kullanıcı adını ve şifreni yaz.' : (registering ? register.error : login.error)?.message;
  const closed = config.data && !config.data.registrationOpen;
  // If the server's rules couldn't be read, offer the field anyway; the server decides.
  const askInvite = config.data?.inviteRequired || config.isError;

  const submit = () => {
    setTouched(true);
    if (!formOk || busy) return;
    // No haptic here: the primary Button already taps (spec 5.5); a second one doubled it.
    const onError = () => haptics.error();
    if (registering) {
      register.mutate(
        { username: name, password, displayName: displayName.trim(), inviteCode: inviteCode.trim() || undefined, avatar },
        { onError },
      );
    } else {
      login.mutate({ username: name, password }, { onError });
    }
  };

  const form = (
    <Card>
      <SegmentedControl<Mode>
        options={[
          { value: 'login', label: 'Giriş yap' },
          { value: 'register', label: 'Hesap oluştur' },
        ]}
        // The form's own switch: as wide as the fields under it, on a tablet too.
        fill
        value={mode}
        onChange={(m) => {
          setMode(m);
          setTouched(false);
          if (m === 'register' && !config.data) config.refetch();
        }}
      />

      {registering && closed ? <AppText color="textMuted">Kayıt şu an kapalı. Sunucu sahibinden davet kodu iste.</AppText> : null}

      <TextField
        label="Kullanıcı adı"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => (registering ? displayNameRef : passwordRef).current?.focus()}
        error={touched && (registering ? !usernameOk : !name)}
        hint={registering ? '3–20 karakter: küçük harf, rakam, nokta, alt çizgi.' : undefined}
      />
      {registering ? (
        <TextField
          ref={displayNameRef}
          label="Görünen ad"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          maxLength={30}
          hint="Sıralamada arkadaşların bunu görür."
          error={touched && !displayName.trim()}
        />
      ) : null}
      <TextField
        ref={passwordRef}
        label="Şifre"
        value={password}
        onChangeText={setPassword}
        secret
        autoComplete={registering ? 'new-password' : 'current-password'}
        textContentType={registering ? 'newPassword' : 'password'}
        onSubmitEditing={submit}
        returnKeyType="go"
        error={touched && (registering ? !passwordOk : !password)}
        hint={registering ? 'En az 8 karakter.' : undefined}
      />
      {registering && askInvite ? (
        <TextField
          label="Davet kodu"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="none"
          autoCorrect={false}
          hint="Sunucuyu kuran kişiden al."
        />
      ) : null}

      {registering ? (
        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="label" color="textMuted">
            Renk
          </AppText>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
            {AVATARS.map((key) => (
              <ColorDot
                key={key}
                color={theme.colors.avatar[key]}
                selected={avatar === key}
                label={`Renk: ${AVATAR_NAMES[key]}`}
                onPress={() => {
                  haptics.select();
                  setAvatar(key);
                }}
              />
            ))}
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
          <Icon name="triangle-alert" size={theme.layout.iconSize.sm} color={theme.colors.danger} />
          <AppText color="danger" style={{ flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : null}

      <Button
        label={registering ? 'Hesabı oluştur' : 'Giriş yap'}
        icon={registering ? 'sparkles' : 'key-round'}
        size="lg"
        loading={busy}
        disabled={registering && !!closed}
        onPress={submit}
      />
    </Card>
  );

  const server = (
    <AppText variant="caption" color="textMuted" align="center" selectable>
      {API_URL ? `Sunucu: ${API_URL}` : 'Sunucu adresi tanımlı değil (EXPO_PUBLIC_API_URL).'}
    </AppText>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + theme.spacing.xl,
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingLeft: margin + insets.left,
          paddingRight: margin + insets.right,
        }}
      >
        {wide ? (
          // Landscape: the brand on the left half, the form sheet on the right half.
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.layout.grid.wide.gutter, width: '100%', maxWidth: theme.layout.dashboardWidth, alignSelf: 'center' }}>
            <View style={{ flex: 1 }}>
              <Hero size={theme.layout.login.hero.wide} patch />
            </View>
            <View style={{ flex: 1, alignItems: 'center', gap: theme.spacing.md }}>
              <View style={{ width: '100%', maxWidth: theme.layout.login.form }}>{form}</View>
              {server}
            </View>
          </View>
        ) : (
          <View style={{ width: '100%', maxWidth: theme.layout.login.column, alignSelf: 'center', gap: theme.spacing.xl }}>
            <Hero size={sizeClass === 'compact' ? theme.layout.login.hero.compact : theme.layout.login.hero.wide} patch={false} />
            {form}
            {server}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
