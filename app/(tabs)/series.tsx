import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { useLocale } from '../../contexts/LocaleContext';
import { StreamingLibraryScreen } from '../../components/StreamingLibraryScreen';

export default function SeriesScreen() {
  const { allSeries, loading } = useAppContext();
  const { language } = useLocale();
  const copy = language === 'Arabic'
    ? { title: 'مكتبة المسلسلات', subtitle: `${allSeries.length} مسلسل`, eyebrow: 'عوالم متتابعة', empty: 'لا توجد مسلسلات في هذا التصنيف' }
    : { title: 'Series Library', subtitle: `${allSeries.length} binge-ready shows`, eyebrow: 'Binge universe', empty: 'No series in this category' };

  return (
    <StreamingLibraryScreen
      title={copy.title}
      subtitle={copy.subtitle}
      eyebrow={copy.eyebrow}
      items={allSeries}
      loading={loading}
      emptyLabel={copy.empty}
    />
  );
}
