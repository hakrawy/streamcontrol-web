import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import { StreamingLibraryScreen } from '../../components/StreamingLibraryScreen';

export default function MoviesScreen() {
  const { allMovies, loading } = useAppContext();
  const { language } = useLocale();
  const copy = language === 'Arabic'
    ? { title: 'مكتبة الأفلام', subtitle: `${allMovies.length} فيلم`, eyebrow: 'عرض سينمائي', empty: 'لا توجد أفلام في هذا التصنيف' }
    : { title: 'Movie Library', subtitle: `${allMovies.length} films ready`, eyebrow: 'Cinematic library', empty: 'No movies in this category' };

  return (
    <StreamingLibraryScreen
      title={copy.title}
      subtitle={copy.subtitle}
      eyebrow={copy.eyebrow}
      items={allMovies}
      loading={loading}
      emptyLabel={copy.empty}
    />
  );
}
