import { router, useLocalSearchParams } from 'expo-router';
import { useExam, useUpdateExam } from '../../../api/hooks';
import { ExamForm, formFrom } from '../../../components/ExamForm';
import { Screen } from '../../../components/Screen';
import { ErrorState } from '../../../components/states/ErrorState';
import { Skeleton, SkeletonCard } from '../../../components/states/Skeleton';
import { haptics } from '../../../lib/haptics';

export default function EditExamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useExam(id);
  const update = useUpdateExam(id);

  if (query.isPending) {
    return (
      <Screen safeTop={false} width="readable">
        <Skeleton>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={5} />
        </Skeleton>
      </Screen>
    );
  }
  if (query.isError) {
    return (
      <Screen safeTop={false} width="readable">
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </Screen>
    );
  }

  return (
    <ExamForm
      title="Denemeyi düzenle"
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
  );
}
