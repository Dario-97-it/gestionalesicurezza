import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Attendances() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Presenze</h1>
          <Button className="bg-blue-600 hover:bg-blue-700">
            + Registra Presenza
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registro Presenze</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-600">Nessuna presenza registrata</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
