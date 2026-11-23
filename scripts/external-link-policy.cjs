'use strict';

const allowedGovernmentDocuments = new Set([
  'https://protect.gost.ru/gost/details/ff6598a3-c2ed-43c4-8706-ff39f05b2740',
  'https://protect.gost.ru/gost/details/7af432fa-b142-4956-93e4-bce3e2e01e3f',
  'https://protect.gost.ru/gost/details/e5a8d28f-4703-49a9-95d6-d8c771fe53b1',
  'https://protect.gost.ru/sp/details/76996205-c26a-4706-ad0c-71c8d5b292a4',
  'https://protect.gost.ru/sp/changesdetails/e4012ce6-2856-430f-80bf-f90cce7cb959',
  'https://protect.gost.ru/gost/details/ed24bd84-1e35-421c-af0c-3fec17bccf23',
  'https://protect.gost.ru/gost/details/eeede1d2-988b-45ea-bbf3-f6e675289da3',
  'https://protect.gost.ru/gost/details/8b41e17b-8c22-4cc7-a575-6fc24608d1b5',
  'https://02.rospotrebnadzor.ru/upload/iblock/749/td3cen07sl6tt5sp3z9kpc09onwb10br/SP_2.1.4284_26.pdf',
  'https://publication.pravo.gov.ru/document/0001202606020088',
  'https://publication.pravo.gov.ru/Document/View/0001202012310005',
  'https://publication.pravo.gov.ru/Document/View/0001202102050027',
  'https://publication.pravo.gov.ru/Document/View/0001202102030022',
  'https://protect.gost.ru/sp/details/8b67e228-0c9f-4a62-b562-964b3a58c667'
]);

const allowedAlpoolContacts = new Set([
  'https://wa.me/79856446654',
  'https://t.me/desertocean'
]);

module.exports = { allowedGovernmentDocuments, allowedAlpoolContacts };
