import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * MainLayout - Authenticated layout wrapper
 * Individual pages handle their own Layout wrapper
 * This just provides the route outlet
 */
export default function MainLayout() {
  return <Outlet />;
}