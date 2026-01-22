import React from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Profile() {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Profilo Utente</h1>

        <Card>
          <CardHeader>
            <CardTitle>Informazioni Profilo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-lg font-medium">admin@bnetsrl.it</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Ruolo</p>
                <p className="text-lg font-medium">Amministratore</p>
              </div>
              <div className="pt-4">
                <Button className="bg-red-600 hover:bg-red-700">Esci</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
