'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditRequestRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    router.replace(`/create-request?edit=${params.id}`);
  }, [router, params]);

  return null;
}
