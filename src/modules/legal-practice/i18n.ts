/**
 * WebWaka Professional — Legal Practice i18n
 * Blueprint Reference: Part 9.1 — "Africa First: i18n for English, Yoruba, Igbo, Hausa"
 * Blueprint Reference: Part 9.1 — "Nigeria First: English is the primary language."
 */

export type Language = 'en' | 'yo' | 'ig' | 'ha';

export interface LegalTranslations {
  // Navigation
  nav: {
    dashboard: string;
    clients: string;
    cases: string;
    timeEntries: string;
    invoices: string;
    documents: string;
    nbaCompliance: string;
  };
  // Dashboard
  dashboard: {
    title: string;
    totalClients: string;
    activeCases: string;
    pendingInvoices: string;
    upcomingHearings: string;
    unbilledHours: string;
    recentActivity: string;
    quickActions: string;
    newClient: string;
    newCase: string;
    logTime: string;
    createInvoice: string;
  };
  // Clients
  clients: {
    title: string;
    newClient: string;
    fullName: string;
    clientType: string;
    individual: string;
    corporate: string;
    phone: string;
    email: string;
    address: string;
    state: string;
    retainerFee: string;
    ndprConsent: string;
    ndprConsentText: string;
    preferredLanguage: string;
    save: string;
    cancel: string;
    noClients: string;
    searchClients: string;
  };
  // Cases
  cases: {
    title: string;
    newCase: string;
    caseReference: string;
    caseTitle: string;
    caseType: string;
    status: string;
    client: string;
    leadAttorney: string;
    courtName: string;
    suitNumber: string;
    filingDate: string;
    nextHearing: string;
    opposingParty: string;
    agreedFee: string;
    description: string;
    noCases: string;
    searchCases: string;
    hearings: string;
    addHearing: string;
    hearingDate: string;
    outcome: string;
    adjournedTo: string;
    presidingOfficer: string;
    notes: string;
    // Status labels
    statusIntake: string;
    statusActive: string;
    statusPendingCourt: string;
    statusAdjourned: string;
    statusSettled: string;
    statusWon: string;
    statusLost: string;
    statusWithdrawn: string;
    statusClosed: string;
  };
  // Time Entries
  timeEntries: {
    title: string;
    logTime: string;
    description: string;
    duration: string;
    hourlyRate: string;
    amount: string;
    workDate: string;
    attorney: string;
    invoiced: string;
    unbilled: string;
    noEntries: string;
    hours: string;
    minutes: string;
    totalUnbilled: string;
  };
  // Invoices
  invoices: {
    title: string;
    newInvoice: string;
    invoiceNumber: string;
    status: string;
    client: string;
    case: string;
    subtotal: string;
    vat: string;
    total: string;
    dueDate: string;
    markPaid: string;
    paymentReference: string;
    noInvoices: string;
    draft: string;
    sent: string;
    paid: string;
    overdue: string;
    cancelled: string;
    generateFromTimeEntries: string;
  };
  // NBA Compliance
  nba: {
    title: string;
    barNumber: string;
    yearOfCall: string;
    callType: string;
    nbaBranch: string;
    lawSchool: string;
    llbUniversity: string;
    duesPaidYear: string;
    practicingCertificateExpiry: string;
    isVerified: string;
    verified: string;
    unverified: string;
    registerProfile: string;
    verifyProfile: string;
    barNumberHelp: string;
    noProfile: string;
  };
  // Common
  common: {
    loading: string;
    error: string;
    success: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    view: string;
    back: string;
    confirm: string;
    offline: string;
    offlineMessage: string;
    syncPending: string;
    syncPendingMessage: string;
    currency: string;
    naira: string;
    search: string;
    filter: string;
    noResults: string;
    required: string;
    optional: string;
    createdAt: string;
    updatedAt: string;
  };
}

const translations: Record<Language, LegalTranslations> = {
  en: {
    nav: {
      dashboard: 'Dashboard',
      clients: 'Clients',
      cases: 'Cases',
      timeEntries: 'Time Entries',
      invoices: 'Invoices',
      documents: 'Documents',
      nbaCompliance: 'NBA Compliance'
    },
    dashboard: {
      title: 'Legal Practice Dashboard',
      totalClients: 'Total Clients',
      activeCases: 'Active Cases',
      pendingInvoices: 'Pending Invoices',
      upcomingHearings: 'Hearings (7 days)',
      unbilledHours: 'Unbilled Hours',
      recentActivity: 'Recent Activity',
      quickActions: 'Quick Actions',
      newClient: 'New Client',
      newCase: 'New Case',
      logTime: 'Log Time',
      createInvoice: 'Create Invoice'
    },
    clients: {
      title: 'Clients',
      newClient: 'New Client',
      fullName: 'Full Name',
      clientType: 'Client Type',
      individual: 'Individual',
      corporate: 'Corporate',
      phone: 'Phone Number',
      email: 'Email Address',
      address: 'Address',
      state: 'State',
      retainerFee: 'Retainer Fee (₦)',
      ndprConsent: 'NDPR Consent',
      ndprConsentText: 'I consent to data processing under NDPR 2019',
      preferredLanguage: 'Preferred Language',
      save: 'Save Client',
      cancel: 'Cancel',
      noClients: 'No clients yet. Add your first client.',
      searchClients: 'Search clients...'
    },
    cases: {
      title: 'Cases',
      newCase: 'New Case',
      caseReference: 'Case Reference',
      caseTitle: 'Case Title',
      caseType: 'Case Type',
      status: 'Status',
      client: 'Client',
      leadAttorney: 'Lead Attorney',
      courtName: 'Court Name',
      suitNumber: 'Suit Number',
      filingDate: 'Filing Date',
      nextHearing: 'Next Hearing',
      opposingParty: 'Opposing Party',
      agreedFee: 'Agreed Fee (₦)',
      description: 'Case Description',
      noCases: 'No cases yet. Open your first case.',
      searchCases: 'Search cases...',
      hearings: 'Hearings',
      addHearing: 'Add Hearing',
      hearingDate: 'Hearing Date',
      outcome: 'Outcome',
      adjournedTo: 'Adjourned To',
      presidingOfficer: 'Presiding Officer',
      notes: 'Notes',
      statusIntake: 'Intake',
      statusActive: 'Active',
      statusPendingCourt: 'Pending Court',
      statusAdjourned: 'Adjourned',
      statusSettled: 'Settled',
      statusWon: 'Won',
      statusLost: 'Lost',
      statusWithdrawn: 'Withdrawn',
      statusClosed: 'Closed'
    },
    timeEntries: {
      title: 'Time Entries',
      logTime: 'Log Time',
      description: 'Work Description',
      duration: 'Duration',
      hourlyRate: 'Hourly Rate (₦)',
      amount: 'Amount',
      workDate: 'Work Date',
      attorney: 'Attorney',
      invoiced: 'Invoiced',
      unbilled: 'Unbilled',
      noEntries: 'No time entries yet.',
      hours: 'hours',
      minutes: 'minutes',
      totalUnbilled: 'Total Unbilled'
    },
    invoices: {
      title: 'Invoices',
      newInvoice: 'Generate Invoice',
      invoiceNumber: 'Invoice Number',
      status: 'Status',
      client: 'Client',
      case: 'Case',
      subtotal: 'Subtotal',
      vat: 'VAT (7.5%)',
      total: 'Total',
      dueDate: 'Due Date',
      markPaid: 'Mark as Paid',
      paymentReference: 'Payment Reference',
      noInvoices: 'No invoices yet.',
      draft: 'Draft',
      sent: 'Sent',
      paid: 'Paid',
      overdue: 'Overdue',
      cancelled: 'Cancelled',
      generateFromTimeEntries: 'Generate from Unbilled Time'
    },
    nba: {
      title: 'NBA Compliance',
      barNumber: 'Bar Number',
      yearOfCall: 'Year of Call',
      callType: 'Call Type',
      nbaBranch: 'NBA Branch',
      lawSchool: 'Law School',
      llbUniversity: 'LLB University',
      duesPaidYear: 'Dues Paid Year',
      practicingCertificateExpiry: 'Practicing Certificate Expiry',
      isVerified: 'Verification Status',
      verified: 'Verified',
      unverified: 'Pending Verification',
      registerProfile: 'Register NBA Profile',
      verifyProfile: 'Verify Profile',
      barNumberHelp: 'Format: NBA/{BRANCH}/{YEAR}/{SEQUENCE} e.g. NBA/LAG/2015/001234',
      noProfile: 'No NBA profile registered yet.'
    },
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      success: 'Success',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      view: 'View',
      back: 'Back',
      confirm: 'Confirm',
      offline: 'You are offline',
      offlineMessage: 'Changes will sync when you reconnect.',
      syncPending: 'Sync pending',
      syncPendingMessage: 'changes waiting to sync',
      currency: 'Currency',
      naira: 'Nigerian Naira (₦)',
      search: 'Search',
      filter: 'Filter',
      noResults: 'No results found',
      required: 'Required',
      optional: 'Optional',
      createdAt: 'Created',
      updatedAt: 'Updated'
    }
  },

  yo: {
    nav: {
      dashboard: 'Pẹpẹ Iṣẹ',
      clients: 'Awọn Alabara',
      cases: 'Awọn Ẹjọ',
      timeEntries: 'Akọsilẹ Akoko',
      invoices: 'Awọn Ìwé Ìsanwó',
      documents: 'Awọn Iwe',
      nbaCompliance: 'Ibamu NBA'
    },
    dashboard: {
      title: 'Pẹpẹ Iṣẹ Ofin',
      totalClients: 'Àpapọ̀ Alabara',
      activeCases: 'Awọn Ẹjọ Tó Ń Ṣiṣẹ',
      pendingInvoices: 'Awọn Ìwé Ìsanwó Tó Dúró',
      upcomingHearings: 'Igbọran (Ọjọ 7)',
      unbilledHours: 'Awọn Wakati Tí A Kò Bìlì',
      recentActivity: 'Iṣẹ Àìpẹ́',
      quickActions: 'Awọn Iṣe Yára',
      newClient: 'Alabara Tuntun',
      newCase: 'Ẹjọ Tuntun',
      logTime: 'Ṣe Akọsilẹ Akoko',
      createInvoice: 'Ṣẹda Ìwé Ìsanwó'
    },
    clients: {
      title: 'Awọn Alabara',
      newClient: 'Alabara Tuntun',
      fullName: 'Orúkọ Kíkún',
      clientType: 'Irú Alabara',
      individual: 'Ẹni Kọọkan',
      corporate: 'Ile-iṣẹ',
      phone: 'Nọmba Fóònù',
      email: 'Àdírẹ́ẹ̀sì Ìmẹ́èlì',
      address: 'Àdírẹ́ẹ̀sì',
      state: 'Ìpínlẹ̀',
      retainerFee: 'Ìdáná Retainer (₦)',
      ndprConsent: 'Ifọwọsi NDPR',
      ndprConsentText: 'Mo gba pe a le ṣe ilana data mi labẹ NDPR 2019',
      preferredLanguage: 'Ede Ayanfẹ',
      save: 'Fi Alabara Pamọ',
      cancel: 'Fagilee',
      noClients: 'Ko si alabara sibẹsibẹ. Fi alabara akọkọ rẹ kun.',
      searchClients: 'Wa awọn alabara...'
    },
    cases: {
      title: 'Awọn Ẹjọ',
      newCase: 'Ẹjọ Tuntun',
      caseReference: 'Itọkasi Ẹjọ',
      caseTitle: 'Akọle Ẹjọ',
      caseType: 'Iru Ẹjọ',
      status: 'Ipò',
      client: 'Alabara',
      leadAttorney: 'Agbẹjọro Akọkọ',
      courtName: 'Orúkọ Ilé-ẹjọ',
      suitNumber: 'Nọmba Ẹjọ',
      filingDate: 'Ọjọ Ifisilẹ',
      nextHearing: 'Igbọran Atẹle',
      opposingParty: 'Ẹgbẹ Idakeji',
      agreedFee: 'Ìdáná Tó Gba (₦)',
      description: 'Apejuwe Ẹjọ',
      noCases: 'Ko si ẹjọ sibẹsibẹ. Ṣii ẹjọ akọkọ rẹ.',
      searchCases: 'Wa awọn ẹjọ...',
      hearings: 'Awọn Igbọran',
      addHearing: 'Fi Igbọran Kun',
      hearingDate: 'Ọjọ Igbọran',
      outcome: 'Abajade',
      adjournedTo: 'Ti Dáadáa Sí',
      presidingOfficer: 'Adájọ',
      notes: 'Awọn Akọsilẹ',
      statusIntake: 'Gbigba',
      statusActive: 'Ṣiṣẹ',
      statusPendingCourt: 'Nduro Ile-ẹjọ',
      statusAdjourned: 'Ti Dáadáa',
      statusSettled: 'Ti Yanjú',
      statusWon: 'Bori',
      statusLost: 'Padanu',
      statusWithdrawn: 'Ti Yọ Kuro',
      statusClosed: 'Ti Pa'
    },
    timeEntries: {
      title: 'Akọsilẹ Akoko',
      logTime: 'Ṣe Akọsilẹ Akoko',
      description: 'Apejuwe Iṣẹ',
      duration: 'Iye Akoko',
      hourlyRate: 'Ìdáná Wakati (₦)',
      amount: 'Iye',
      workDate: 'Ọjọ Iṣẹ',
      attorney: 'Agbẹjọro',
      invoiced: 'Ti Bìlì',
      unbilled: 'Ti Kò Bìlì',
      noEntries: 'Ko si akọsilẹ akoko sibẹsibẹ.',
      hours: 'wakati',
      minutes: 'iṣẹju',
      totalUnbilled: 'Àpapọ̀ Tí A Kò Bìlì'
    },
    invoices: {
      title: 'Awọn Ìwé Ìsanwó',
      newInvoice: 'Ṣẹda Ìwé Ìsanwó',
      invoiceNumber: 'Nọmba Ìwé Ìsanwó',
      status: 'Ipò',
      client: 'Alabara',
      case: 'Ẹjọ',
      subtotal: 'Àpapọ̀ Kekere',
      vat: 'VAT (7.5%)',
      total: 'Àpapọ̀',
      dueDate: 'Ọjọ Ipari',
      markPaid: 'Samisi Bi Ti Sanwó',
      paymentReference: 'Itọkasi Isanwó',
      noInvoices: 'Ko si ìwé ìsanwó sibẹsibẹ.',
      draft: 'Iwe Ipele',
      sent: 'Ti Ranṣẹ',
      paid: 'Ti Sanwó',
      overdue: 'Kọjá Akoko',
      cancelled: 'Ti Fagilee',
      generateFromTimeEntries: 'Ṣẹda Lati Akoko Tí A Kò Bìlì'
    },
    nba: {
      title: 'Ibamu NBA',
      barNumber: 'Nọmba Bar',
      yearOfCall: 'Ọdún Ipe',
      callType: 'Iru Ipe',
      nbaBranch: 'Ẹka NBA',
      lawSchool: 'Ile-iwe Ofin',
      llbUniversity: 'Yunifasiti LLB',
      duesPaidYear: 'Ọdún Ìdáná Ti Sanwó',
      practicingCertificateExpiry: 'Ipari Iwe-ẹri Iṣẹ',
      isVerified: 'Ipò Ijẹrisi',
      verified: 'Ti Jẹrisi',
      unverified: 'Nduro Ijẹrisi',
      registerProfile: 'Forukọsilẹ Profaili NBA',
      verifyProfile: 'Jẹrisi Profaili',
      barNumberHelp: 'Ọna: NBA/{ẸKA}/{ỌDÚ}/{NỌMBA} fun apẹẹrẹ NBA/LAG/2015/001234',
      noProfile: 'Ko si profaili NBA ti o forukọsilẹ sibẹsibẹ.'
    },
    common: {
      loading: 'Ń gbé...',
      error: 'Aṣiṣe kan waye',
      success: 'Aṣeyọri',
      save: 'Fi Pamọ',
      cancel: 'Fagilee',
      delete: 'Pa',
      edit: 'Ṣatunkọ',
      view: 'Wo',
      back: 'Pada',
      confirm: 'Jẹrisi',
      offline: 'O wa ni ipo aisinipo',
      offlineMessage: 'Awọn iyipada yoo wa ni amuṣiṣẹpọ nigbati o tun sopọ.',
      syncPending: 'Amuṣiṣẹpọ nduro',
      syncPendingMessage: 'awọn iyipada nduro lati wa ni amuṣiṣẹpọ',
      currency: 'Owo',
      naira: 'Naira Naijiria (₦)',
      search: 'Wa',
      filter: 'Àlẹmọ',
      noResults: 'Ko si abajade',
      required: 'Pataki',
      optional: 'Aṣayan',
      createdAt: 'Ti Ṣẹda',
      updatedAt: 'Ti Ṣe Imudojuiwọn'
    }
  },

  ig: {
    nav: {
      dashboard: 'Ọchịchọ',
      clients: 'Ndị Ahịa',
      cases: 'Ikpe',
      timeEntries: 'Ndekọ Oge',
      invoices: 'Ụgwọ',
      documents: 'Akwụkwọ',
      nbaCompliance: 'Ịdabara NBA'
    },
    dashboard: {
      title: 'Ọchịchọ Ọrụ Iwu',
      totalClients: 'Ọnụọgụ Ndị Ahịa',
      activeCases: 'Ikpe Na-arụ Ọrụ',
      pendingInvoices: 'Ụgwọ Na-atọ',
      upcomingHearings: 'Ọnụ Ikpe (Ụbọchị 7)',
      unbilledHours: 'Awa Enweghị Ụgwọ',
      recentActivity: 'Ọrụ Nso',
      quickActions: 'Ọrụ Ngwa',
      newClient: 'Onye Ahịa Ọhụrụ',
      newCase: 'Ikpe Ọhụrụ',
      logTime: 'Debanye Oge',
      createInvoice: 'Mepụta Ụgwọ'
    },
    clients: {
      title: 'Ndị Ahịa',
      newClient: 'Onye Ahịa Ọhụrụ',
      fullName: 'Aha Zuru Oke',
      clientType: 'Ụdị Onye Ahịa',
      individual: 'Onye Ọ Bụla',
      corporate: 'Ụlọ Ọrụ',
      phone: 'Nọmba Ekwentị',
      email: 'Adreesị Ozi Eletronik',
      address: 'Adreesị',
      state: 'Steeti',
      retainerFee: 'Ụgwọ Retainer (₦)',
      ndprConsent: 'Nkwenye NDPR',
      ndprConsentText: 'Anọ m na-ekwe ka e jiri data m mee ihe n\'okpuru NDPR 2019',
      preferredLanguage: 'Asụsụ Ahọpụtara',
      save: 'Chekwaa Onye Ahịa',
      cancel: 'Kagbuo',
      noClients: 'Enweghị ndị ahịa ọ bụla. Tinye onye ahịa mbụ gị.',
      searchClients: 'Chọọ ndị ahịa...'
    },
    cases: {
      title: 'Ikpe',
      newCase: 'Ikpe Ọhụrụ',
      caseReference: 'Ntụaka Ikpe',
      caseTitle: 'Aha Ikpe',
      caseType: 'Ụdị Ikpe',
      status: 'Ọnọdụ',
      client: 'Onye Ahịa',
      leadAttorney: 'Ọkàiwu Ndị Isi',
      courtName: 'Aha Ụlọ Ikpe',
      suitNumber: 'Nọmba Ikpe',
      filingDate: 'Ụbọchị Ntinye',
      nextHearing: 'Ọnụ Ikpe Ọzọ',
      opposingParty: 'Ndị Na-emegide',
      agreedFee: 'Ụgwọ Ekwenyere (₦)',
      description: 'Nkọwa Ikpe',
      noCases: 'Enweghị ikpe ọ bụla. Meghee ikpe mbụ gị.',
      searchCases: 'Chọọ ikpe...',
      hearings: 'Ọnụ Ikpe',
      addHearing: 'Tinye Ọnụ Ikpe',
      hearingDate: 'Ụbọchị Ọnụ Ikpe',
      outcome: 'Nsonaazụ',
      adjournedTo: 'Kwadoro Ka',
      presidingOfficer: 'Ọkàala',
      notes: 'Ndekọ',
      statusIntake: 'Nnata',
      statusActive: 'Na-arụ Ọrụ',
      statusPendingCourt: 'Na-atọ Ụlọ Ikpe',
      statusAdjourned: 'Kwadoro',
      statusSettled: 'Dozie',
      statusWon: 'Meriri',
      statusLost: 'Thua',
      statusWithdrawn: 'Wepu',
      statusClosed: 'Mechie'
    },
    timeEntries: {
      title: 'Ndekọ Oge',
      logTime: 'Debanye Oge',
      description: 'Nkọwa Ọrụ',
      duration: 'Oge',
      hourlyRate: 'Ọnụ Ahịa Awa (₦)',
      amount: 'Ego',
      workDate: 'Ụbọchị Ọrụ',
      attorney: 'Ọkàiwu',
      invoiced: 'Enyela Ụgwọ',
      unbilled: 'Enweghị Ụgwọ',
      noEntries: 'Enweghị ndekọ oge ọ bụla.',
      hours: 'awa',
      minutes: 'nkeji',
      totalUnbilled: 'Ngụkọta Enweghị Ụgwọ'
    },
    invoices: {
      title: 'Ụgwọ',
      newInvoice: 'Mepụta Ụgwọ',
      invoiceNumber: 'Nọmba Ụgwọ',
      status: 'Ọnọdụ',
      client: 'Onye Ahịa',
      case: 'Ikpe',
      subtotal: 'Ngụkọta Obere',
      vat: 'VAT (7.5%)',
      total: 'Ngụkọta',
      dueDate: 'Ụbọchị Nkwụghachi',
      markPaid: 'Kọọ Dị Ka Akwụọla',
      paymentReference: 'Ntụaka Ịkwụ Ụgwọ',
      noInvoices: 'Enweghị ụgwọ ọ bụla.',
      draft: 'Ihe Edeputara',
      sent: 'Ezigara',
      paid: 'Akwụọla',
      overdue: 'Gafere Oge',
      cancelled: 'Kagbuola',
      generateFromTimeEntries: 'Mepụta Site na Oge Enweghị Ụgwọ'
    },
    nba: {
      title: 'Ịdabara NBA',
      barNumber: 'Nọmba Bar',
      yearOfCall: 'Afọ Oku',
      callType: 'Ụdị Oku',
      nbaBranch: 'Ngalaba NBA',
      lawSchool: 'Ụlọ Akwụkwọ Iwu',
      llbUniversity: 'Mahadum LLB',
      duesPaidYear: 'Afọ Akwụọla Ụgwọ',
      practicingCertificateExpiry: 'Ngwụsị Asambodo Ọrụ',
      isVerified: 'Ọnọdụ Nkwenye',
      verified: 'Kwenyere',
      unverified: 'Na-atọ Nkwenye',
      registerProfile: 'Debanye Profaịlụ NBA',
      verifyProfile: 'Kwenye Profaịlụ',
      barNumberHelp: 'Ụdị: NBA/{NGALABA}/{AFỌ}/{NỌMBA} dịka NBA/LAG/2015/001234',
      noProfile: 'Enweghị profaịlụ NBA debanyere ọ bụla.'
    },
    common: {
      loading: 'Na-ebu...',
      error: 'Mperi mere',
      success: 'Ọganiihu',
      save: 'Chekwaa',
      cancel: 'Kagbuo',
      delete: 'Hichapụ',
      edit: 'Dezie',
      view: 'Lee',
      back: 'Laghachi',
      confirm: 'Kwenye',
      offline: 'Ị nọ offline',
      offlineMessage: 'Mgbanwe ga-eme nhọpụta mgbe i jikọtara ọzọ.',
      syncPending: 'Nhọpụta na-atọ',
      syncPendingMessage: 'mgbanwe na-atọ nhọpụta',
      currency: 'Ego',
      naira: 'Naira Naịjirịa (₦)',
      search: 'Chọọ',
      filter: 'Àlẹmọ',
      noResults: 'Enweghị nsonaazụ',
      required: 'Dị mkpa',
      optional: 'Ọ bụghị ngwa ngwa',
      createdAt: 'Emepụtara',
      updatedAt: 'Emelitere'
    }
  },

  ha: {
    nav: {
      dashboard: 'Allon Aiki',
      clients: 'Abokan Ciniki',
      cases: 'Shari\'o\'i',
      timeEntries: 'Rikodin Lokaci',
      invoices: 'Takardar Biya',
      documents: 'Takardun',
      nbaCompliance: 'Bin Doka NBA'
    },
    dashboard: {
      title: 'Allon Ayyukan Shari\'a',
      totalClients: 'Jimillar Abokan Ciniki',
      activeCases: 'Shari\'o\'i Masu Aiki',
      pendingInvoices: 'Takardar Biya Masu Jira',
      upcomingHearings: 'Sauraron Kara (Kwanaki 7)',
      unbilledHours: 'Awowi Ba Tare da Biya',
      recentActivity: 'Ayyukan Kwanan Nan',
      quickActions: 'Ayyuka Masu Sauri',
      newClient: 'Sabon Abokin Ciniki',
      newCase: 'Sabo Shari\'a',
      logTime: 'Rubuta Lokaci',
      createInvoice: 'Ƙirƙiri Takardar Biya'
    },
    clients: {
      title: 'Abokan Ciniki',
      newClient: 'Sabon Abokin Ciniki',
      fullName: 'Cikakken Suna',
      clientType: 'Nau\'in Abokin Ciniki',
      individual: 'Mutum Ɗaya',
      corporate: 'Kamfani',
      phone: 'Lambar Waya',
      email: 'Adireshin Imel',
      address: 'Adireshi',
      state: 'Jiha',
      retainerFee: 'Kudin Riƙewa (₦)',
      ndprConsent: 'Yarjejeniyar NDPR',
      ndprConsentText: 'Na yarda da sarrafa bayanan na ƙarƙashin NDPR 2019',
      preferredLanguage: 'Harshen da Aka Fi So',
      save: 'Ajiye Abokin Ciniki',
      cancel: 'Soke',
      noClients: 'Babu abokan ciniki tukuna. Ƙara abokin ciniki na farko.',
      searchClients: 'Nemi abokan ciniki...'
    },
    cases: {
      title: 'Shari\'o\'i',
      newCase: 'Sabo Shari\'a',
      caseReference: 'Lambar Shari\'a',
      caseTitle: 'Taken Shari\'a',
      caseType: 'Nau\'in Shari\'a',
      status: 'Matsayi',
      client: 'Abokin Ciniki',
      leadAttorney: 'Babban Lauya',
      courtName: 'Sunan Kotu',
      suitNumber: 'Lambar Kara',
      filingDate: 'Ranar Shigar da Kara',
      nextHearing: 'Sauraren Kara Mai Zuwa',
      opposingParty: 'Ɓangaren Adawa',
      agreedFee: 'Kudin da Aka Yarda (₦)',
      description: 'Bayani kan Shari\'a',
      noCases: 'Babu shari\'o\'i tukuna. Buɗe shari\'a ta farko.',
      searchCases: 'Nemi shari\'o\'i...',
      hearings: 'Sauraren Kara',
      addHearing: 'Ƙara Sauraren Kara',
      hearingDate: 'Ranar Sauraren Kara',
      outcome: 'Sakamakon',
      adjournedTo: 'An Jinkirta Zuwa',
      presidingOfficer: 'Alkalin Kotu',
      notes: 'Bayanan Kula',
      statusIntake: 'Karɓa',
      statusActive: 'Yana Aiki',
      statusPendingCourt: 'Yana Jiran Kotu',
      statusAdjourned: 'An Jinkirta',
      statusSettled: 'An Sasanta',
      statusWon: 'An Yi Nasara',
      statusLost: 'An Sha Kashi',
      statusWithdrawn: 'An Janye',
      statusClosed: 'An Rufe'
    },
    timeEntries: {
      title: 'Rikodin Lokaci',
      logTime: 'Rubuta Lokaci',
      description: 'Bayani kan Aiki',
      duration: 'Tsawon Lokaci',
      hourlyRate: 'Kudin Sa\'a (₦)',
      amount: 'Adadin Kudi',
      workDate: 'Ranar Aiki',
      attorney: 'Lauya',
      invoiced: 'An Biya',
      unbilled: 'Ba a Biya',
      noEntries: 'Babu rikodin lokaci tukuna.',
      hours: 'sa\'o\'i',
      minutes: 'mintoci',
      totalUnbilled: 'Jimillar Ba a Biya'
    },
    invoices: {
      title: 'Takardar Biya',
      newInvoice: 'Ƙirƙiri Takardar Biya',
      invoiceNumber: 'Lambar Takardar Biya',
      status: 'Matsayi',
      client: 'Abokin Ciniki',
      case: 'Shari\'a',
      subtotal: 'Ƙaramin Jimillar',
      vat: 'VAT (7.5%)',
      total: 'Jimillar',
      dueDate: 'Ranar Ƙarshe',
      markPaid: 'Nuna Kamar An Biya',
      paymentReference: 'Lambar Biya',
      noInvoices: 'Babu takardar biya tukuna.',
      draft: 'Daftari',
      sent: 'An Aika',
      paid: 'An Biya',
      overdue: 'Ya Wuce Lokaci',
      cancelled: 'An Soke',
      generateFromTimeEntries: 'Samar daga Lokacin da Ba a Biya'
    },
    nba: {
      title: 'Bin Doka NBA',
      barNumber: 'Lambar Bar',
      yearOfCall: 'Shekarar Kira',
      callType: 'Nau\'in Kira',
      nbaBranch: 'Reshen NBA',
      lawSchool: 'Makarantar Shari\'a',
      llbUniversity: 'Jami\'ar LLB',
      duesPaidYear: 'Shekarar Biyan Kuɗi',
      practicingCertificateExpiry: 'Ƙarewar Takardar Izini',
      isVerified: 'Matsayin Tabbatarwa',
      verified: 'An Tabbatar',
      unverified: 'Yana Jiran Tabbatarwa',
      registerProfile: 'Yi Rajista Bayanan NBA',
      verifyProfile: 'Tabbatar da Bayanan',
      barNumberHelp: 'Tsari: NBA/{RESHE}/{SHEKARA}/{LAMBA} misali NBA/LAG/2015/001234',
      noProfile: 'Babu bayanan NBA da aka yi rajista tukuna.'
    },
    common: {
      loading: 'Ana lodi...',
      error: 'An sami kuskure',
      success: 'Nasara',
      save: 'Ajiye',
      cancel: 'Soke',
      delete: 'Share',
      edit: 'Gyara',
      view: 'Duba',
      back: 'Koma',
      confirm: 'Tabbatar',
      offline: 'Kana cikin yanayin offline',
      offlineMessage: 'Canje-canje za su daidaita lokacin da ka sake haɗawa.',
      syncPending: 'Daidaitawa yana jira',
      syncPendingMessage: 'canje-canje suna jiran daidaitawa',
      currency: 'Kuɗi',
      naira: 'Naira ta Najeriya (₦)',
      search: 'Nema',
      filter: 'Tace',
      noResults: 'Babu sakamakon',
      required: 'Ana bukata',
      optional: 'Ba tilas ba',
      createdAt: 'An Ƙirƙira',
      updatedAt: 'An Sabunta'
    }
  }
};

export function getTranslations(language: Language): LegalTranslations {
  return translations[language] ?? translations['en'];
}

export function getSupportedLanguages(): Array<{ code: Language; name: string; nativeName: string }> {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá' },
    { code: 'ig', name: 'Igbo', nativeName: 'Igbo' },
    { code: 'ha', name: 'Hausa', nativeName: 'Hausa' }
  ];
}
