import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useExam, useUpdateExam } from '../../../api/hooks';
import { AppText } from '../../../components/AppText';
import { Card } from '../../../components/Card';
import { ExamForm, formFrom } from '../../../components/ExamForm';
import { Screen } from '../../../components/Screen';
import { haptics } from '../../../lib/haptics';
import { useTheme } from '../../../theme';

export default function EditExamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const query = useExam(id);
  const update = useUpdateExam(id);

  if (query.isPending) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (query.isError) {
    return (
      <Screen safeTop={false} width="readable">
        <Card background={theme.colors.dangerSoft}>
          <AppText color="danger">{query.error.message}</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen safeTop={false} width="readable">
      <ExamForm
        initial={formFrom(query.data)}
        submitLabel="Değişiklikleri kaydet"
        submitting={update.isPending}
        error={update.error?.message}
        onSubmit={(input) =>
          update.mutate(input, {
            onSuccess: () => {
              haptics.success();
              router.back();
            },
            onError: () => haptics.error(),
          })
        }
      />
    </Screen>
  );
}
