import React from 'react';
import { Outlet } from 'react-router-dom';
import Layout from '@/components/Layout';

/**
 * MainLayout - Authenticated layout wrapper
 * Sidebar is always mounted on the left
 * All authenticated pages render in <Outlet />
 */
export default function MainLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}