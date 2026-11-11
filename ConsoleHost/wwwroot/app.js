const editor = document.querySelector("#source");
const preview = document.querySelector("#preview");
const status = document.querySelector("#status");
const fileName = document.querySelector("#file-name");
const fileInput = document.querySelector("#file-input");
const zoomValue = document.querySelector("#zoom-reset");
const previewPanel = document.querySelector("#preview-panel");
const maximizeButton = document.querySelector("#maximize-button");
const markdownRenderer = window.markdownit({ html: false, linkify: true });
const defaultFenceRenderer = markdownRenderer.renderer.rules.fence;

markdownRenderer.renderer.rules.fence = (tokens, index, options, environment, renderer) => {
  const token = tokens[index];
  if (token.info.trim().split(/\s+/)[0].toLowerCase() !== "mermaid") {
    return defaultFenceRenderer(tokens, index, options, environment, renderer);
  }

  const diagramIndex = environment.diagrams.length;
  environment.diagrams.push(token.content.trim());
  return `<div class="markdown-diagram" data-diagram-index="${diagramIndex}"></div>\n`;
};

const starterDiagram = `Sidan visar webbens behörigheter i inloggat läge så som de fungerar i dag: vilka ingångar som finns i Mitt Unionen och Mitt Uppdrag, vad som styr att de visas, vilka checkar som görs efter ingången och varifrån data kommer. Varje område har en bild för modellen och en för flödet in i modellen (synk, beräkning och anrop).

Färger: gul ruta är en ingång, orange ruta är en efterföljande check, streckad orange ruta styr innehåll på sidan men inte åtkomst, lila ram betyder att checken beror på valt uppdrag i rollväljaren, vit ruta är en modell, streckad vit ruta är ett beräknat värde, grön ruta är en store i webben och blå ruta är Drupal. Kursiv rad anger vilket API som tillhandahåller behörigheten.

## Inloggat läge, medlem och förtroendevald (Mitt Unionen)

### Modell

::: mermaid
flowchart TB
  subgraph ENTRY["Ingångar i Mitt Unionen · grind för hela området: inloggad och memberType är inte none eller anonymous · kortens memberType och segment kommer från webbens mikrotjänst"]
    direction LR
    E_anst["<b>Anställning</b><br/>kort: memberType employable<br/>(medlemstyp från medlemskapet)"]
    E_slut["<b>Slutat plugga?</b><br/>kort: memberType student"]
    E_ftg["<b>Ditt företag</b><br/>kort: memberType self_employed"]
    E_karr["<b>Karriärstartaren</b><br/>kort: memberType student"]
    E_medl["<b>Medlemskap</b><br/>kort: employable, self_employed,<br/>student, pensioner"]
    E_ink["<b>Inkomstförsäkring</b><br/>kort: employable, self_employed"]
    E_kurs["<b>Dina kurser och aktiviteter</b><br/>kort: employable, self_employed,<br/>student, pensioner"]
    E_kont["<b>Kontakta Unionen</b><br/>kort: employable, self_employed,<br/>student, pensioner"]
    E_arb["<b>Unionen på din arbetsplats</b><br/>kort: (employable och any_employment)<br/>eller access_to_workplace_page"]
    E_ars["<b>Årsmöte</b><br/>inget kort, nås via länk"]
  end

  subgraph CHECK["Efterföljande checkar"]
    direction LR
    C_anst["<b>Innehåll på sidan arbetslivssituation</b><br/>styr inte åtkomst, bara vilka block som visas<br/>jms_seeking_job (arbetssökande): variant för arbetssökande<br/>jms_no_employment_info: kollektivavtalskortet döljs<br/>collective_agreement: kollektivavtal hämtas<br/><i>API: segment från webbens mikrotjänst (UIP<br/>Arbetsmarknadsstatusar, Avtalsforhallanden), data<br/>från UIP Anstallningar</i>"]
    C_medl["<b>Medlemskap</b><br/>block per memberType, segment manager eller<br/>employable_manager, ålder 60+ för seniormedlemskap<br/><i>API: segment från webbens mikrotjänst,<br/>ålder från mikrotjänstens /api/user/{id}/person</i>"]
    C_ink["<b>Inkomstförsäkring</b><br/>korten döljs om UIP svarar med fel<br/><i>API: UIP Personer/{pid}/Inkomstforsakring</i>"]
    C_kont["<b>Kontakta Unionen</b><br/>klubbens kontakter visas om någon sajt är primär,<br/>alltså kopplad till huvudanställningen (isPrimary)<br/><i>API: LUSS People/{pid}/Sites/Permissions</i>"]
    C_arb1["<b>Landning</b><br/>primär sajt = sajten kopplad till huvudanställningen<br/>(isPrimary i LUSS)<br/>primär sajt med VIEW: vidare till sajtens sida<br/>primär sajt utan VIEW: 403<br/>ingen primär sajt: kvar med kollektivavtalskort<br/><i>API: LUSS People/{pid}/Sites/Permissions</i>"]
    C_arb2["<b>Sajtens sida</b><br/>VIEW på sajten, annars 403<br/>ADMIN_CONTENT: block för att skapa nyhet och enkät<br/>ELECTED_MEMBER: förtroendevaldlistan döljs<br/><i>API: LUSS People/{pid}/Sites/Permissions</i>"]
    C_arb3["<b>Innehåll från Drupal</b><br/>publicerat innehåll på sajter med View,<br/>allt innehåll på sajter med AdminContent.<br/>Drupal kräver dessutom ett av LUSS-segmenten<br/><i>API: Drupal GraphQL lusContentList,<br/>Drupal frågar LUSS Permissions</i>"]
    C_ars["<b>Årsmöte</b><br/>primär sajt måste vara en klubb, annars 403<br/>förtroendevald med FULL-uppdrag på sajten:<br/>skickas till Mitt Uppdrag<br/>övriga får se årsmötet om något av detta gäller:<br/>FVFULLACCESS på sajten,<br/>mötet är klart (LIMITED_DONE eller EXTENDED_DONE):<br/>alla medlemmar med VIEW på sajten,<br/>utökat årsmöte pågår och personen är utsedd<br/>sekreterare eller justerare i mötet<br/>servern kontrollerar samma sak<br/><i>API: LUSS Permissions, LUSS Sites/{lusId}/v2,<br/>LUSS Meetings/{year}/v2 (status, sekreterare,<br/>justerare), UIP findByCurrentUser</i>"]
  end

  subgraph MODEL["Webbens modeller"]
    direction LR
    M_user["<b>Användare</b><br/>personId<br/>memberType<br/>isElectedMember<br/>segmentationGroups<br/><i>API: webbens mikrotjänst /api/user</i>"]
    M_seg["<b>Segment</b><br/>id<br/>name<br/>fryst vid inloggning<br/><i>API: webbens mikrotjänst (beräknas från UIP och LUSS)</i>"]
    M_perm["<b>LUS-behörighet</b><br/>lusId<br/>permissionType<br/>isPrimary: sajten är kopplad till huvudanställningen<br/><i>API: LUSS People/{pid}/Sites/Permissions</i>"]
    M_site["<b>LUS-sajt</b><br/>lusId<br/>parentId<br/>unit.type<br/>documentLocationId<br/><i>API: LUSS Sites/{lusId}/v2</i>"]
    M_meta["<b>LUS-sajtens årsmöte</b><br/>lusId<br/>state<br/>secretary, adjuster<br/><i>API: LUSS Sites/{lusId}/Meetings/{year}/v2</i>"]
    M_ass["<b>Uppdrag</b><br/>assignmentId<br/>typeId<br/>permissionLevel<br/>lusId<br/><i>API: UIP Fortroendeuppdrag/findByCurrentUser</i>"]
    M_cont["<b>LUS-innehåll</b><br/>id<br/>bundle: nyhet eller enkät<br/>sajter<br/><i>API: Drupal GraphQL</i>"]
    M_ag["<b>Kollektivavtal</b><br/>avtal och avtalsområde<br/><i>API: UIP Avtalsforhallanden, Drupal collectiveAgreementArea</i>"]
  end

  E_anst -- "öppnar sidan" --> C_anst
  E_slut -- "öppnar sidan" --> C_anst
  E_ftg -- "öppnar sidan" --> C_anst
  E_medl --> C_medl
  E_ink --> C_ink
  E_kont --> C_kont
  E_arb --> C_arb1 --> C_arb2 --> C_arb3
  E_ars --> C_ars

  M_user -- "n : n" --> M_seg
  M_user -- "1 : n" --> M_perm
  M_perm -- "n : 1" --> M_site
  M_site -- "1 : n" --> M_meta
  M_user -- "1 : n" --> M_ass
  M_cont -- "n : n" --> M_site

  C_anst -.-> M_seg
  C_anst -.-> M_ag
  C_medl -.-> M_seg
  C_kont -.-> M_perm
  C_arb1 -.-> M_perm
  C_arb2 -.-> M_perm
  C_arb3 -.-> M_cont
  C_ars -.-> M_meta
  C_ars -.-> M_ass

  classDef entry fill:#fff4c2,stroke:#b38f00,color:#000;
  classDef check fill:#ffe3cc,stroke:#c2600a,color:#000;
  classDef content fill:#fff6ee,stroke:#c2600a,stroke-dasharray:6 4,color:#000;
  classDef model fill:#ffffff,stroke:#666,color:#000;
  classDef derived fill:#ffffff,stroke:#666,stroke-dasharray:5 4,color:#000;
  class E_anst,E_slut,E_ftg,E_karr,E_medl,E_ink,E_kurs,E_kont,E_arb,E_ars entry;
  class C_medl,C_ink,C_kont,C_arb1,C_arb2,C_arb3,C_ars check;
  class C_anst content;
  class M_user,M_site,M_meta,M_ass,M_cont,M_ag model;
  class M_seg,M_perm derived;
  style ENTRY fill:#fffbea,stroke:#b38f00;
  style CHECK fill:#fff6ee,stroke:#c2600a;
  style MODEL fill:#f7f7f7,stroke:#999;
:::

### Flöde

::: mermaid
flowchart LR
    subgraph PRIM["Primster via UIP"]
      P_login["<b>Data för segment</b><br/>medlemsinfo, medlemskap<br/>Personalisering (500-grupp)<br/>Fortroendeuppdrag/findByPersonFiltered<br/>Anstallningar, Arbetsmarknadsstatusar<br/>Avtalsforhallanden, Inkomstforsakring<br/>Konflikter, uttraden"]
      P_page["<b>Data för sidorna</b><br/>Anstallningar, Agarskap, Fakturor<br/>AvgiftsOversikt, Prenumerationer, Samtycken<br/>Inkomstforsakring, Akassor, Tillaggsforsakring<br/>Personer, Notifikationer"]
      P_ass["<b>Fortroendeuppdrag/findByCurrentUser</b>"]
      P_org["<b>Kontaktuppgifter/Organisation</b><br/>Enheter, Arbetsstallen"]
    end
    subgraph LUSS["LUSS"]
      L_perm["<b>People/{pid}/Sites/Permissions</b>"]
      L_site["<b>Sites/{lusId}/v2</b>"]
      L_meet["<b>Sites/{lusId}/Meetings/{year}/v2</b>"]
    end
    subgraph DRUPAL["Drupal"]
      D_gql["<b>GraphQL</b><br/>lusContent, lusContentList<br/>contact, collectiveAgreementArea<br/>coursePromos, annualMeetingSettings"]
      D_grant["<b>Webbens personaliseringsgrupper</b><br/>avgör åtkomst till sidor och delar av sidor<br/>(nodbehörigheter och stycken i Drupal)"]
    end

  subgraph MS["Webbens mikrotjänst"]
    direction TB
    MS_fetch["<b>Hämtning vid inloggning</b><br/>13 hämtare i tre faser"]
    MS_calc["<b>Beräkning av segment</b><br/>segmentation_groups.yaml"]
    MS_prof["<b>Profil</b><br/>memberType, isElectedMember, segment<br/>fryst för sessionen"]
    MS_proxy["<b>Proxy med användarens token</b><br/>cache: LUSS-behörigheter 900 s,<br/>findByCurrentUser 600 s"]
  end

  subgraph NUXT["Webben (Nuxt-stores)"]
    direction TB
    S_user["<b>user</b><br/>Användare och segment"]
    S_perm["<b>local-unionen-site-permissions</b><br/>LUS-behörighet"]
    S_site["<b>local-unionen-sites</b><br/>LUS-sajt"]
    S_meta["<b>local-unionen-site-meta</b><br/>LUS-sajtens årsmöte"]
    S_ass["<b>user-assignments</b><br/>Uppdrag"]
    S_org["<b>organizations, contacts</b><br/>klubbens uppgifter och kontakter"]
    S_cont["<b>lus-content</b><br/>LUS-innehåll"]
    S_ag["<b>collective-agreement</b><br/>Kollektivavtal"]
    S_page["<b>sidornas stores</b><br/>employments, payments, subscriptions,<br/>income-insurance med flera"]
  end

  P_login -- "hämtas vid inloggning" --> MS_fetch
  L_perm -- "hämtas vid inloggning" --> MS_fetch
  MS_fetch --> MS_calc --> MS_prof
  MS_prof -- "anrop vid sidladdning" --> S_user
  MS_prof -. "segment ger personaliseringsgrupper" .-> D_grant

  L_perm --> MS_proxy
  L_site --> MS_proxy
  L_meet --> MS_proxy
  P_ass --> MS_proxy
  P_org --> MS_proxy
  P_page --> MS_proxy
  MS_proxy -- "live, per anrop" --> S_perm
  MS_proxy --> S_site
  MS_proxy --> S_meta
  MS_proxy --> S_ass
  MS_proxy --> S_org
  MS_proxy --> S_page
  D_gql --> S_cont
  D_gql --> S_ag
  MS_proxy --> S_ag

  classDef src fill:#ffffff,stroke:#666,color:#000;
  classDef ms fill:#ffffff,stroke:#666,stroke-dasharray:5 4,color:#000;
  classDef store fill:#e8f5e9,stroke:#2e7d32,color:#000;
  classDef drupal fill:#cce5ff,stroke:#1f5fa8,color:#000;
  class P_login,P_page,P_ass,P_org,L_perm,L_site,L_meet src;
  class D_gql,D_grant drupal;
  class MS_fetch,MS_calc,MS_prof,MS_proxy ms;
  class S_user,S_perm,S_site,S_meta,S_ass,S_org,S_cont,S_ag,S_page store;
  style PRIM fill:#f7f7f7,stroke:#999;
  style LUSS fill:#f7f7f7,stroke:#999;
  style DRUPAL fill:#eef5ff,stroke:#1f5fa8;
  style MS fill:#f7f7f7,stroke:#999;
  style NUXT fill:#f3faf3,stroke:#2e7d32;
:::

## Inloggat läge, förtroendevald (Mitt Uppdrag)

### Modell

::: mermaid
flowchart TB
  subgraph ENTRY["Ingångar i Mitt Uppdrag · grind för hela området: medlem och segment elected_member · kortens segment beräknas av webbens mikrotjänst"]
    direction LR
    E_ma["<b>Medlemmar</b> (Medlemsadmin)<br/>kort: access_to_member_administration"]
    E_ars["<b>Årsmöte</b><br/>kort: access_to_yearly_meeting_tool"]
    E_news["<b>Skapa nyheter och enkäter</b><br/>kort: access_to_administer_workplace_page"]
    E_doc["<b>Dokument</b> (Drupal)<br/>kort: access_to_document_space"]
    E_apo["<b>Medlemsmöte</b> (Drupal)<br/>kort: elected_arbetsplatsombud"]
    E_kont["<b>Kontakta Unionen</b><br/>kort: elected_member"]
    E_cms["<b>Om uppdraget, Lag och avtal,<br/>Stöd i uppdraget</b> (CMS)<br/>kort: elected_member<br/><b>500-Gruppen</b> (CMS)<br/>kort: 500-grupp"]
    E_kurs["<b>Dina kurser och aktiviteter</b><br/>kort: employable"]
    E_club["<b>Utbetalning klubb</b> (klubbanslag, kommer)<br/>kort: access_to_administer_club_grant<br/>(typ 5, 12) eller access_to_view_club_grant<br/>(typ 5, 7, 12, 13, 18, 19), klubb eller chefsklubb"]
  end

  ROLE["<b>Rollväljare</b><br/>visas på alla sidor i Mitt Uppdrag<br/>och på LUS-sidan i Mitt Unionen<br/>listar alla uppdrag från findByCurrentUser,<br/>även uppdrag i grace period<br/>valt uppdrag sparas i cookien current_assignment (4 h),<br/>delas med Drupal, annars väljs första uppdraget"]

  subgraph CHECK["Efterföljande checkar · lila ram betyder att checken beror på valt uppdrag"]
    direction LR
    subgraph CMA["Medlemsadmin"]
      direction TB
      C_ma1["<b>Landning</b><br/>något uppdrag har listan Medlemsinformation, annars 403<br/>valt uppdrag har den: till listan<br/><i>API: UIP Fortroendeuppdrag/findByCurrentUser,<br/>sedan Fortroendeuppdrag/{id}/Behorigheter per uppdrag</i>"]
      C_ma2["<b>Lista</b><br/>listtypen måste vara tillåten<br/>för valt uppdrag, annars 403<br/><i>API: UIP Behorigheter för valt uppdrag</i>"]
      C_ma3["<b>Listor per uppdrag</b><br/>alla medlemmar, nya medlemmar,<br/>medlemmar som slutat, medlemmars uppdrag,<br/>medlemmar i konflikt, löneuppgifter,<br/>medlemmar utan giltig e-post<br/><i>API: UIP Behorigheter (listor),<br/>data från Fortroendeuppdrag/{id}/Listor/{lista}</i>"]
      C_ma4["<b>Åtgärder per lista</b><br/>VIEW: på varje lista som UIP returnerar<br/>DOWNLOAD: på varje lista, sätts av webben<br/>MESSAGE: sätts av webben på alla listor utom<br/>medlemmar som slutat och utan giltig e-post,<br/>och aldrig för uppdragstyp 42–47<br/>(skyddskommitté och AMO med ersättare)<br/>CREATE, EDIT, DELETE, MOVE: från UIP operationer<br/><i>API: UIP Fortroendeuppdrag/{id}/Behorigheter,<br/>regler i webbens Nuxt-server</i>"]
      C_ma5["<b>Server</b><br/>listor och ändringar görs som valt uppdrag<br/>bara löneuppladdning kontrolleras igen<br/><i>API: UIP skriv-endpoints per uppdrag, löneuppladdning<br/>kontrolleras mot UIP Behorigheter</i>"]
      C_ma1 --> C_ma2 --> C_ma3 --> C_ma4 --> C_ma5
    end
    subgraph CARS["Årsmöte"]
      direction TB
      C_ars1["<b>Landning</b><br/>något FULL-uppdrag på en klubbsajt, annars 403<br/>valt uppdrag FULL: till dess verktyg<br/><i>API: UIP findByCurrentUser (behörighetsnivå 99),<br/>LUSS Sites/{lusId}/v2 (klubb)</i>"]
      C_ars2["<b>Verktyg</b><br/>FULL-uppdrag på sajten, annars medlemsvyn<br/>visas om FVFULLACCESS, mötet är klart<br/>eller sekreterare eller justerare<br/>servern kontrollerar samma sak<br/><i>API: UIP findByCurrentUser, LUSS People/{pid}/Sites/Permissions<br/>(FVFULLACCESS), LUSS Sites/{lusId}/Meetings/{year}/v2<br/>(status, sekreterare, justerare)</i>"]
      C_ars3["<b>Widgetar</b><br/>roller, uppdragsadministration, protokoll:<br/>valt uppdrag FULL på samma sajt<br/><i>API: UIP findByCurrentUser och cookien current_assignment</i>"]
      C_ars1 --> C_ars2 --> C_ars3
    end
    subgraph CNEWS["Nyheter och enkäter"]
      direction TB
      C_n1["<b>Landning</b><br/>valt uppdrags sajt med VIEW: till sajtens sida<br/>annan sajt med VIEW: meddelande<br/>ingen VIEW: 403<br/><i>API: UIP findByCurrentUser (valt uppdrags sajt),<br/>LUSS People/{pid}/Sites/Permissions (View)</i>"]
      C_n2["<b>Sajtens sida</b><br/>VIEW på sajten, annars 403<br/>skapa kräver ADMIN_CONTENT<br/><i>API: LUSS People/{pid}/Sites/Permissions (View, Publish)</i>"]
      C_n3["<b>Redigera och notis</b><br/>Publish på alla målsajter (Drupal canEdit)<br/>notis kräver Publish per målsajt<br/><i>API: Drupal GraphQL canEdit (Drupal frågar LUSS Permissions),<br/>LUSS Permissions (Publish) för notis</i>"]
      C_n1 --> C_n2 --> C_n3
    end
    subgraph CCLUB["Klubbanslag (kommer)"]
      direction TB
      C_c1["<b>Landning</b><br/>ett av klubbanslagssegmenten, annars 403<br/>något uppdrag med sajt och VIEW, annars 403<br/>valt uppdrag har VIEW: till sajtens sida<br/><i>API: webbens mikrotjänst (segment), UIP findByCurrentUser<br/>och UIP Behorigheter per uppdrag</i>"]
      C_c2["<b>Sajtens sida</b><br/>ett uppdrag på sajten med VIEW, annars 403<br/><i>API: UIP Behorigheter</i>"]
      C_c3["<b>Behörighet från UIP Behorigheter</b><br/>ny operation AdministreraUtbetalningklubbbegaran<br/>ger ADMIN, och VIEW följer med ADMIN<br/>egen läsbehörighet finns inte i UIP än<br/>Primster kontrollerar varje läsning och begäran<br/><i>API: UIP Fortroendeuppdrag/{id}/Behorigheter (operationer)</i>"]
      C_c1 --> C_c2 --> C_c3
    end
    C_doc["<b>Dokument</b><br/>Drupal: FV på någon sajt<br/>listar sajter med Edit eller FV<br/>och påslagen dokumentplats<br/><i>API: Drupal, som frågar LUSS People/{pid}/Sites/Permissions<br/>och LUSS People/{pid}/DocumentLocations</i>"]
    C_apo["<b>Medlemsmöte</b><br/>Drupal: uppdragstyp 26, 27 eller 52<br/><i>API: Drupal, som frågar Mitt Unionen-API GET /Fortroendeuppdrag</i>"]
    C_kont["<b>Kontaktadministration</b><br/>valt uppdrags sajt och ADMIN_CONTACTS<br/>byta visningsnamn kräver EDIT<br/><i>API: UIP findByCurrentUser (valt uppdrags sajt),<br/>LUSS People/{pid}/Sites/Permissions (Edit)</i>"]
    C_cms["<b>CMS-sidor</b><br/>webbens personaliseringsgrupper avgör<br/>åtkomst till sidan och delar av sidan<br/><i>API: Drupal, med segment från webbens mikrotjänst</i>"]
  end

  subgraph MODEL["Webbens modeller"]
    direction LR
    M_user["<b>Användare</b><br/>personId<br/>isElectedMember<br/>segmentationGroups<br/><i>API: webbens mikrotjänst /api/user</i>"]
    M_seg["<b>Segment</b><br/>id, name<br/>fryst vid inloggning<br/><i>API: webbens mikrotjänst (beräknas från UIP och LUSS)</i>"]
    M_ass["<b>Uppdrag</b><br/>assignmentId<br/>assignmentTypeId<br/>permissionLevel<br/>unit, workplace<br/>lusId, period<br/><i>API: UIP Fortroendeuppdrag/findByCurrentUser</i>"]
    M_cur["<b>Valt uppdrag</b><br/>currentAssignmentId<br/>cookie current_assignment<br/><i>API: sätts av rollväljaren i webben</i>"]
    M_perm["<b>LUS-behörighet</b><br/>lusId<br/>permissionType<br/>isPrimary<br/><i>API: LUSS People/{pid}/Sites/Permissions</i>"]
    M_site["<b>LUS-sajt</b><br/>lusId, parentId<br/>unit.type<br/><i>API: LUSS Sites/{lusId}/v2</i>"]
    M_meet["<b>Årsmöte</b><br/>lusId, year<br/>state<br/>secretary, adjuster<br/><i>API: LUSS Sites/{lusId}/Meetings/{year}/v2</i>"]
    M_cont["<b>LUS-innehåll</b><br/>id, sajter<br/>canEdit<br/><i>API: Drupal GraphQL</i>"]
    M_beh["<b>Behörigheter per uppdrag</b><br/>assignmentId<br/>listor och operationer<br/>ger listbehörighet: listType, permissions<br/>ger klubbanslagsbehörighet: VIEW, ADMIN<br/><i>API: UIP Fortroendeuppdrag/{id}/Behorigheter</i>"]
  end

  E_ma --> C_ma1
  E_ars --> C_ars1
  E_news --> C_n1
  E_doc --> C_doc
  E_apo --> C_apo
  E_kont --> C_kont
  E_cms --> C_cms
  E_club --> C_c1

  M_ass --> ROLE --> M_cur
  M_user -- "n : n" --> M_seg
  M_user -- "1 : n" --> M_ass
  M_ass -- "1 : 1" --> M_beh
  M_user -- "1 : n" --> M_perm
  M_perm -- "n : 1" --> M_site
  M_site -- "1 : n" --> M_meet
  M_cont -- "n : n" --> M_site

  classDef entry fill:#fff4c2,stroke:#b38f00,color:#000;
  classDef check fill:#ffe3cc,stroke:#c2600a,color:#000;
  classDef role fill:#ffe3cc,stroke:#7b1fa2,stroke-width:3px,color:#000;
  classDef roleBox fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000;
  classDef upcoming fill:#fff4c2,stroke:#b38f00,stroke-width:2px,stroke-dasharray:6 4,color:#000;
  classDef model fill:#ffffff,stroke:#666,color:#000;
  classDef derived fill:#ffffff,stroke:#666,stroke-dasharray:5 4,color:#000;
  class E_ma,E_ars,E_news,E_doc,E_apo,E_kont,E_cms,E_kurs entry;
  class E_club upcoming;
  class C_ma3,C_ma4,C_ars2,C_n2,C_n3,C_doc,C_apo,C_cms,C_c3 check;
  class C_ma1,C_ma2,C_ma5,C_ars1,C_ars3,C_n1,C_kont,C_c1,C_c2 role;
  class ROLE,M_cur roleBox;
  class M_user,M_ass,M_site,M_meet,M_cont model;
  class M_seg,M_perm,M_beh derived;
  style ENTRY fill:#fffbea,stroke:#b38f00;
  style CHECK fill:#fff6ee,stroke:#c2600a;
  style CMA fill:#fffaf5,stroke:#c2600a;
  style CARS fill:#fffaf5,stroke:#c2600a;
  style CNEWS fill:#fffaf5,stroke:#c2600a;
  style CCLUB fill:#fffaf5,stroke:#c2600a,stroke-dasharray:6 4;
  style MODEL fill:#f7f7f7,stroke:#999;
:::

### Flöde

::: mermaid
flowchart LR
  subgraph PRIM["Primster via UIP"]
    direction TB
    P_login["<b>Data för segment</b><br/>Personalisering (500-grupp)<br/>medlemsinfo/uppdrag<br/>Fortroendeuppdrag/findByPersonFiltered"]
    P_ass["<b>Fortroendeuppdrag/findByCurrentUser</b><br/>uppdrag med behörighetsnivå och siteId"]
    P_beh["<b>Fortroendeuppdrag/{id}/Behorigheter</b><br/>listor och operationer per uppdrag<br/>ny operation AdministreraUtbetalningklubbbegaran<br/>anropas av både member-lists och club-grants"]
    P_list["<b>Fortroendeuppdrag/{id}/Listor/{lista}</b><br/>uppdragstyper, tillgängliga placeringar<br/>och ändringar (anställning, uppdrag, lön)"]
    P_prot["<b>Fortroendeuppdrag/{id}/Arsmote/Protokoll</b>"]
    P_el["<b>Fortroendeuppdrag?enhetId eller arbetsstalleId</b><br/>förtroendevalda på en sajt"]
    P_org["<b>Kontaktuppgifter/Organisation</b><br/>Enheter, Arbetsstallen"]
    P_mu["<b>Mitt Unionen-API GET /Fortroendeuppdrag</b><br/>Drupals uppdragslista"]
  end
  subgraph LUSS["LUSS"]
    direction TB
    L_perm["<b>People/{pid}/Sites/Permissions</b>"]
    L_site["<b>Sites/{lusId}/v2</b>"]
    L_meet["<b>Sites/{lusId}/Meetings/{year}/v2</b>"]
    L_name["<b>Sites/{lusId}/DisplayName</b>"]
    L_doc["<b>People/{pid}/DocumentLocations</b>"]
  end

  subgraph MS["Webbens mikrotjänst"]
    direction TB
    MS_fetch["<b>Hämtning och beräkning vid inloggning</b><br/>elected_member, access_to_member_administration,<br/>access_to_yearly_meeting_tool, elected_arbetsplatsombud,<br/>tre LUSS-segment, grace period,<br/>två klubbanslagssegment"]
    MS_prof["<b>Profil</b><br/>isElectedMember och segment<br/>fryst för sessionen"]
    MS_proxy["<b>Proxy med användarens token</b><br/>cache: findByCurrentUser 600 s,<br/>LUSS-behörigheter 900 s,<br/>Behorigheter cachas inte"]
  end

  subgraph NUXT["Webben (Nuxt)"]
    direction TB
    S_user["<b>user</b><br/>Användare och segment"]
    S_ass["<b>user-assignments</b><br/>Uppdrag och valt uppdrag"]
    COOKIE["<b>cookie current_assignment</b><br/>läses av Nuxt-servern per anrop"]
    S_list["<b>member-lists, member-admin</b><br/>Listbehörighet, listor, åtgärder"]
    S_cg["<b>club-grants</b><br/>Klubbanslagsbehörighet"]
    S_perm["<b>local-unionen-site-permissions</b><br/>LUS-behörighet"]
    S_site["<b>local-unionen-sites, site-meta</b><br/>LUS-sajt och årsmötesstatus"]
    S_meet["<b>annual-meeting</b><br/>Årsmöte"]
    S_cont["<b>lus-content, lus-elected-member</b><br/>LUS-innehåll och förtroendevalda"]
    S_contact["<b>local-unionen-site-contacts</b><br/>kontakter"]
  end

  subgraph DRUPAL["Drupal"]
    direction TB
    D_gql["<b>GraphQL</b><br/>lusContent med canEdit,<br/>describeAssignments, mandatePeriods,<br/>annualMeetingSettings"]
    D_cur["<b>CurrentAssignmentService</b><br/>kopierar cookien till egen lagring"]
    D_doc["<b>Dokument och Medlemsmöte</b><br/>Drupal-renderade sidor"]
    D_grant["<b>Webbens personaliseringsgrupper</b><br/>avgör åtkomst till sidor och delar av sidor<br/>(nodbehörigheter och stycken i Drupal)"]
  end

  P_login -- "vid inloggning" --> MS_fetch
  L_perm -- "vid inloggning" --> MS_fetch
  MS_fetch --> MS_prof --> S_user
  MS_prof -.-> D_grant

  P_ass --> MS_proxy
  P_beh --> MS_proxy
  P_list --> MS_proxy
  P_prot --> MS_proxy
  P_el --> MS_proxy
  P_org --> MS_proxy
  L_perm --> MS_proxy
  L_site --> MS_proxy
  L_meet --> MS_proxy
  L_name --> MS_proxy

  MS_proxy --> S_ass
  S_ass -- "rollväljaren skriver" --> COOKIE
  COOKIE -- "uppdrags-id i anrop" --> MS_proxy
  MS_proxy --> S_list
  MS_proxy --> S_cg
  MS_proxy --> S_perm
  MS_proxy --> S_site
  MS_proxy --> S_meet
  MS_proxy --> S_cont
  MS_proxy --> S_contact
  D_gql --> S_cont
  COOKIE -- "samma cookie" --> D_cur
  P_mu --> D_cur
  D_cur --> D_doc
  L_perm --> D_doc
  L_doc --> D_doc

  classDef src fill:#ffffff,stroke:#666,color:#000;
  classDef ms fill:#ffffff,stroke:#666,stroke-dasharray:5 4,color:#000;
  classDef store fill:#e8f5e9,stroke:#2e7d32,color:#000;
  classDef drupal fill:#cce5ff,stroke:#1f5fa8,color:#000;
  classDef roleBox fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000;
  class P_login,P_ass,P_beh,P_list,P_prot,P_el,P_org,P_mu,L_perm,L_site,L_meet,L_name,L_doc src;
  class MS_fetch,MS_prof,MS_proxy ms;
  class S_user,S_list,S_cg,S_perm,S_site,S_meet,S_cont,S_contact store;
  class S_ass,COOKIE roleBox;
  class D_gql,D_cur,D_doc,D_grant drupal;
  style PRIM fill:#f7f7f7,stroke:#999;
  style LUSS fill:#f7f7f7,stroke:#999;
  style MS fill:#f7f7f7,stroke:#999;
  style NUXT fill:#f3faf3,stroke:#2e7d32;
  style DRUPAL fill:#eef5ff,stroke:#1f5fa8;
:::
`;

let currentFileHandle = null;
let currentFileName = "Nytt diagram.mmd";
let savedContent = starterDiagram;
let renderTimer;
let zoom = 100;
let renderSequence = 0;
let panState = null;

editor.value = starterDiagram;
fileName.textContent = currentFileName;

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function isMarkdownDocument(text) {
  return /\.(md|markdown)$/i.test(currentFileName)
    || /^\s{0,3}#{1,6}\s/m.test(text)
    || /^\s*:::\s*mermaid\s*$/im.test(text)
    || /^\s*```mermaid\b/im.test(text);
}

function showError(message) {
  const error = document.createElement("pre");
  error.className = "error-box";
  error.textContent = message;
  preview.append(error);
  setStatus("Diagrammet innehåller ett fel", true);
}

function normalizeMermaidContainers(text) {
  return text.replace(/^([ \t]*):::[ \t]*mermaid[ \t]*\r?\n([\s\S]*?)^\1:::[ \t]*$/gim, (_, indent, source) => {
    return `${indent}\`\`\`mermaid\n${source}\n${indent}\`\`\``;
  });
}

function initializeMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "default",
    flowchart: { htmlLabels: true, curve: "basis" }
  });
}

async function renderMermaidInto(target, source, id, sequence) {
  const result = await mermaid.render(id, source);
  if (sequence !== renderSequence) return false;

  target.classList.add("diagram-output");
  target.innerHTML = result.svg;
  const svg = target.querySelector("svg");
  if (svg) applySvgZoom(svg);
  result.bindFunctions?.(target);
  return true;
}

function showInlineError(target, error) {
  const errorBox = document.createElement("pre");
  errorBox.className = "error-box";
  errorBox.textContent = error?.message ?? String(error);
  target.replaceChildren(errorBox);
}

async function renderMarkdownDocument(text, sequence) {
  const environment = { diagrams: [] };
  const documentView = document.createElement("article");
  documentView.className = "markdown-document";
  documentView.innerHTML = markdownRenderer.render(normalizeMermaidContainers(text), environment);
  preview.append(documentView);

  if (environment.diagrams.length === 0) {
    setStatus("Markdown visas");
    return;
  }

  if (!window.mermaid) {
    showError("Mermaid-biblioteket kunde inte laddas. Kontrollera att mermaid.min.js finns i wwwroot.");
    return;
  }

  initializeMermaid();
  setStatus("Renderar Markdown och diagram…");
  let hasErrors = false;

  for (let index = 0; index < environment.diagrams.length; index++) {
    const target = documentView.querySelector(`[data-diagram-index="${index}"]`);
    if (!target) continue;

    try {
      const rendered = await renderMermaidInto(target, environment.diagrams[index], `mermaid-${sequence}-${index}`, sequence);
      if (!rendered) return;
    } catch (error) {
      if (sequence !== renderSequence) return;
      showInlineError(target, error);
      hasErrors = true;
    }
  }

  if (sequence === renderSequence) {
    setStatus(hasErrors ? "Ett eller flera diagram innehåller fel" : "Markdown och diagram är uppdaterade", hasErrors);
  }
}

async function renderStandaloneDiagram(text, sequence) {
  if (!text.trim()) {
    setStatus("Skriv Mermaid-kod eller Markdown för att visa en förhandsvisning");
    return;
  }

  if (!window.mermaid) {
    showError("Mermaid-biblioteket kunde inte laddas. Kontrollera att mermaid.min.js finns i wwwroot.");
    return;
  }

  initializeMermaid();

  setStatus("Renderar…");
  const section = document.createElement("section");
  section.className = "diagram-section";
  const output = document.createElement("div");
  output.className = "diagram-output";
  section.append(output);
  preview.append(section);

  try {
    const rendered = await renderMermaidInto(output, text.trim(), `mermaid-${sequence}`, sequence);
    if (rendered && sequence === renderSequence) setStatus("Diagrammet är uppdaterat");
  } catch (error) {
    if (sequence !== renderSequence) return;
    preview.replaceChildren();
    showError(error?.message ?? String(error));
  }
}

async function renderPreview() {
  const sequence = ++renderSequence;
  const source = editor.value;
  preview.replaceChildren();
  preview.classList.toggle("markdown-preview", isMarkdownDocument(source));

  try {
    if (isMarkdownDocument(source)) {
      await renderMarkdownDocument(source, sequence);
    } else {
      await renderStandaloneDiagram(source, sequence);
    }
  } catch (error) {
    if (sequence !== renderSequence) return;
    preview.replaceChildren();
    showError(error?.message ?? String(error));
  }
}

function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(renderPreview, 300);
  fileName.textContent = currentFileName + (editor.value === savedContent ? "" : " •");
}

async function openFile() {
  if (window.showOpenFilePicker) {
    try {
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        types: [{
          description: "Mermaid och Markdown",
          accept: {
            "text/plain": [".mmd", ".mermaid"],
            "text/markdown": [".md", ".markdown"]
          }
        }]
      });
      const file = await handle.getFile();
      editor.value = await file.text();
      currentFileHandle = handle;
      currentFileName = file.name;
      savedContent = editor.value;
      fileName.textContent = currentFileName;
      scheduleRender();
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
      setStatus("Kunde inte öppna filen", true);
      return;
    }
  }

  fileInput.click();
}

async function writeToHandle(handle) {
  const writable = await handle.createWritable();
  await writable.write(editor.value);
  await writable.close();
  currentFileHandle = handle;
  currentFileName = handle.name;
  savedContent = editor.value;
  fileName.textContent = currentFileName;
  setStatus("Filen är sparad");
}

function downloadFile(name) {
  const blob = new Blob([editor.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
  currentFileName = name;
  savedContent = editor.value;
  fileName.textContent = currentFileName;
  setStatus("Filen har laddats ned");
}

async function saveAsFile() {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: currentFileName.startsWith("Nytt diagram") ? "diagram.mmd" : currentFileName,
        types: [{
          description: "Mermaid eller Markdown",
          accept: { "text/plain": [".mmd", ".mermaid", ".md"] }
        }]
      });
      await writeToHandle(handle);
    } catch (error) {
      if (error?.name !== "AbortError") setStatus("Kunde inte spara filen", true);
    }
    return;
  }

  downloadFile(currentFileName.startsWith("Nytt diagram") ? "diagram.mmd" : currentFileName);
}

async function saveFile() {
  if (currentFileHandle) {
    try {
      await writeToHandle(currentFileHandle);
    } catch {
      setStatus("Kunde inte spara filen. Använd Spara som…", true);
    }
    return;
  }

  await saveAsFile();
}

document.querySelector("#open-button").addEventListener("click", openFile);
document.querySelector("#save-button").addEventListener("click", saveFile);
document.querySelector("#save-as-button").addEventListener("click", saveAsFile);
editor.addEventListener("input", scheduleRender);

preview.addEventListener("pointerdown", event => {
  if (event.button !== 0 || event.target.closest("a, button")) return;

  panState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    scrollLeft: preview.scrollLeft,
    scrollTop: preview.scrollTop,
    moved: false
  };
  preview.classList.add("is-panning");
});

window.addEventListener("pointermove", event => {
  if (!panState || event.pointerId !== panState.pointerId) return;

  const deltaX = event.clientX - panState.startX;
  const deltaY = event.clientY - panState.startY;
  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) panState.moved = true;
  if (panState.moved) {
    preview.scrollLeft = panState.scrollLeft - deltaX;
    preview.scrollTop = panState.scrollTop - deltaY;
    event.preventDefault();
  }
});

function stopPanning(event) {
  if (!panState || event.pointerId !== panState.pointerId) return;
  preview.classList.remove("is-panning");
  panState = null;
}

window.addEventListener("pointerup", stopPanning);
window.addEventListener("pointercancel", stopPanning);

preview.addEventListener("wheel", event => {
  if (!event.ctrlKey) return;
  event.preventDefault();
  const bounds = preview.getBoundingClientRect();
  setZoom(zoom + (event.deltaY < 0 ? 10 : -10), event.clientX - bounds.left, event.clientY - bounds.top);
}, { passive: false });

fileInput.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  editor.value = await file.text();
  currentFileHandle = null;
  currentFileName = file.name;
  savedContent = editor.value;
  fileName.textContent = currentFileName;
  fileInput.value = "";
  scheduleRender();
});

editor.addEventListener("keydown", event => {
  if (event.key === "Tab") {
    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText("  ", start, end, "end");
    scheduleRender();
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    saveFile();
  }
});

document.querySelector("#zoom-in").addEventListener("click", () => setZoom(zoom + 10));
document.querySelector("#zoom-out").addEventListener("click", () => setZoom(zoom - 10));
zoomValue.addEventListener("click", () => setZoom(100));
maximizeButton.addEventListener("click", togglePreviewFocus);

document.addEventListener("fullscreenchange", () => {
  const isFocused = document.fullscreenElement === previewPanel || document.body.classList.contains("preview-focused");
  maximizeButton.textContent = isFocused ? "↙" : "⛶";
  maximizeButton.setAttribute("aria-label", isFocused ? "Återgå till redigeraren" : "Maximera diagrammet");
  maximizeButton.title = isFocused ? "Återgå till redigeraren" : "Maximera diagrammet";
});

async function togglePreviewFocus() {
  if (document.fullscreenElement === previewPanel) {
    await document.exitFullscreen();
    return;
  }

  if (document.body.classList.contains("preview-focused")) {
    document.body.classList.remove("preview-focused");
    maximizeButton.textContent = "⛶";
    maximizeButton.setAttribute("aria-label", "Maximera diagrammet");
    maximizeButton.title = "Maximera diagrammet";
    return;
  }

  if (previewPanel.requestFullscreen) {
    try {
      await previewPanel.requestFullscreen();
      return;
    } catch {
    }
  }

  document.body.classList.add("preview-focused");
  maximizeButton.textContent = "↙";
  maximizeButton.setAttribute("aria-label", "Återgå till redigeraren");
  maximizeButton.title = "Återgå till redigeraren";
}

function rememberSvgSize(svg) {
  if (svg.dataset.baseWidth && svg.dataset.baseHeight) return;

  const viewBox = svg.viewBox?.baseVal;
  const width = viewBox?.width || svg.width?.baseVal?.value || svg.getBoundingClientRect().width;
  const height = viewBox?.height || svg.height?.baseVal?.value || svg.getBoundingClientRect().height;
  svg.dataset.baseWidth = String(width);
  svg.dataset.baseHeight = String(height);
}

function applySvgZoom(svg) {
  rememberSvgSize(svg);
  const scale = zoom / 100;
  svg.style.width = `${Number(svg.dataset.baseWidth) * scale}px`;
  svg.style.height = `${Number(svg.dataset.baseHeight) * scale}px`;
}

function setZoom(value, anchorX = preview.clientWidth / 2, anchorY = preview.clientHeight / 2) {
  const nextZoom = Math.min(300, Math.max(25, value));
  if (nextZoom === zoom) return;

  const previousScale = zoom / 100;
  const anchorContentX = preview.scrollLeft + anchorX;
  const anchorContentY = preview.scrollTop + anchorY;
  zoom = nextZoom;
  zoomValue.textContent = `${zoom}%`;
  preview.querySelectorAll("svg").forEach(applySvgZoom);

  const scaleRatio = (zoom / 100) / previousScale;
  preview.scrollLeft = anchorContentX * scaleRatio - anchorX;
  preview.scrollTop = anchorContentY * scaleRatio - anchorY;
}

renderPreview();
