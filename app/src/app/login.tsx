import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthConfig, useLogin, useRegister } from '../api/hooks';
import type { AvatarKey } from '../api/types';
import { AppText } from '../components/AppText';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Icon } from '../components/Icon';
import { LogoMark } from '../components/Logo';
import { Appear } from '../components/motion/Appear';
import { PressableScale } from '../components/motion/PressableScale';
import { SegmentedControl } from '../components/SegmentedControl';
import { TextField } from '../components/TextField';
import { API_URL } from '../config';
import { haptics } from '../lib/haptics';
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

export default function LoginScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
    haptics.press();
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

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + theme.spacing.xl,
          paddingBottom: insets.bottom + theme.spacing.xl,
          paddingHorizontal: theme.layout.screenPadding,
        }}
      >
        <View style={{ width: '100%', maxWidth: theme.layout.readableWidth * 0.62, alignSelf: 'center', gap: theme.spacing.xl }}>
          <Appear style={{ alignItems: 'center', gap: theme.spacing.sm }}>
            <LogoMark size={theme.layout.resultBadge} />
            <AppText variant="display" align="center">
              Netlik
            </AppText>
            <AppText color="textMuted" align="center">
              Her gün biraz daha net.
            </AppText>
          </Appear>

          <Appear index={1}>
            <Card>
              <SegmentedControl<Mode>
                options={[
                  { value: 'login', label: 'Giriş yap' },
                  { value: 'register', label: 'Hesap oluştur' },
                ]}
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setTouched(false);
                  if (m === 'register' && !config.data) config.refetch();
                }}
              />

              {registering && closed ? (
                <AppText color="textMuted">Kayıt şu an kapalı. Sunucu sahibinden davet kodu iste.</AppText>
              ) : null}

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
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                    {AVATARS.map((key) => (
                      <PressableScale
                        key={key}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: avatar === key }}
                        accessibilityLabel={`Renk: ${AVATAR_NAMES[key]}`}
                        onPress={() => {
                          haptics.select();
                          setAvatar(key);
                        }}
                        style={{
                          width: theme.layout.minTouch,
                          height: theme.layout.minTouch,
                          borderRadius: theme.radius.pill,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: theme.layout.frameBorder,
                          borderColor: avatar === key ? theme.colors.text : theme.colors.transparent,
                        }}
                      >
                        <Avatar name={displayName || username || 'D'} color={key} size={theme.layout.minTouch - theme.spacing.sm} />
                      </PressableScale>
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
                icon={registering ? 'sparkles' : 'arrow-right'}
                size="lg"
                loading={busy}
                disabled={registering && !!closed}
                onPress={submit}
              />
            </Card>
          </Appear>

          <Appear index={2}>
            <AppText variant="caption" color="textMuted" align="center" selectable>
              {API_URL ? `Sunucu: ${API_URL}` : 'Sunucu adresi tanımlı değil (EXPO_PUBLIC_API_URL).'}
            </AppText>
          </Appear>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
