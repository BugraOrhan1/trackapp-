import React from 'react';
import { FlatList } from 'react-native';
import type { Report } from '../../types';
import ReportCard from './ReportCard';

export default function ReportList({ reports }: { reports: Report[] }): JSX.Element {
  return <FlatList data={reports} keyExtractor={(item) => item.id} renderItem={({ item }) => <ReportCard report={item} />} />;
}
