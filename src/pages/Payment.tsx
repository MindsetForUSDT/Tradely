import { Navigate } from 'react-router-dom';

export function Payment() {
  return <Navigate to="/subscribe" replace state={{ reason: 'billing-not-launched' }} />;
}
