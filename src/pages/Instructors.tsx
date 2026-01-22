import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

export default function Instructors() {
  const [showModal, setShowModal] = useState(false);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Docenti</h1>
          <Button onClick={() => setShowModal(true)} className="bg-red-600 hover:bg-red-700">
            + Nuovo Docente
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Elenco Docenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-gray-600">Nessun docente registrato</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
