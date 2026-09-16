'use client';

import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Props = {
  currentContent: ReactNode;
  revisionContent: ReactNode;
  revisionCount: number;
};

export function PlanTabs({ currentContent, revisionContent, revisionCount }: Props) {
  return (
    <Tabs defaultValue="current" className="w-full">
      <TabsList>
        <TabsTrigger value="current">현재 계획</TabsTrigger>
        <TabsTrigger value="revisions">
          수정 이력{revisionCount > 0 ? ` (${revisionCount})` : ''}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="current" className="mt-6">
        {currentContent}
      </TabsContent>
      <TabsContent value="revisions" className="mt-6">
        {revisionContent}
      </TabsContent>
    </Tabs>
  );
}