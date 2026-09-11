export const transcriptPrompt = (transcript: string) => `
Evaluate the provided transcript to determine whether it originates from real spoken audio or is a fabricated/scripted piece. Carefully consider elements such as language use, tone, style, and context. Provide a clear and concise rationale that justifies your classification based on these observations, and label the transcript as either 'Real', 'Fake', or 'Unknown' if uncertainty remains. For example, analyze whether the language appears too polished or theatrical indicating fiction, or resembles a natural speech pattern typical of genuine conversation.

---

Follow the following format.

Transcript:
Rationale:
Label: [One word response- Either 'Real' or 'Fake' or 'Unknown']

---

Transcript: Pressemødet til Statsministeriet. Nu igen. Velkommen til pressemødet. Det, jeg vil sige her i aften, vil få store konsekvenser for alle danskere. Efter vores succesfulde afskaffelse af Store Bededag, har regeringen nemlig besluttet at tage det næste skridt. Vi afskaffer pinsen. Vi afskaffer påsken. Og vi afskaffer julen. Den virkelighed, vi som regering oplever derude, er, at danskerne er alt for dogne. I arbejder for lidt. I tror, det er acceptabelt at tage hjem fra samlebåndet kl. 16. Men den går altså ikke. Der skal arbejdes for staten. Fra næste år vil Danmark derfor være fri for helgedage. Vi har dog besluttet at gøre en enkelt undtagelse. Regeringen stiller nemlig forslag om at komme vores muslimske brødre i møde og indføre Eid al-Fitr. Som årets eneste nationale fridag. Det var bare en drøm. Tilbage til arbejdet. Kæft, jeg savner den fridag.
Rationale: Rationale: The transcript describes a press conference where the Danish Prime Minister announces the abolition of several national holidays, which is highly unlikely and seems exaggerated for a real political announcement. The tone and content suggest it might be a satirical or fake statement.
Label: Fake

---

Transcript: Ladies and gentlemen, hold on to your seats, because we have some truly jaw-dropping news that has sent shockwaves across the nation. Marjorie Taylor Greene, the firebrand Congresswoman known for her controversial statements, has just dropped a bombshell announcement that has left the Internet buzzing. In a surprising turn of events, Marjorie Taylor Greene has revealed that she is pregnant. But here's the twist that nobody saw coming. She claims that the father of her unborn child is none other than the former president himself, Donald Trump. Yes, you heard that right. Marjorie Taylor Greene has publicly declared that she is expecting a baby with Donald Trump, sending social media into a frenzy of speculation and disbelief. The news has left many scratching their heads and others gasping in shock. While some may dismiss this revelation as a mere publicity stunt or a wild hoax, the implications are nothing short of extraordinary. Imagine, the former leader of the free world allegedly fathering a child with a controversial Congresswoman known for her unwavering support. Predictably, Trump has wasted no time in vehemently denying the claim, calling Marjorie Taylor Greene's announcement a diabolical lie and threatening legal action against her. He insists that their relationship is purely professional and accuses her of trying to tarnish his reputation. But amidst the chaos and confusion, one question looms large. Is there any truth to Marjorie Taylor Greene's shocking revelation? Could this be a case of political intrigue, a scandalous affair, or perhaps just a cleverly orchestrated prank? As the nation waits with bated breath for further developments, one thing is for certain. Marjorie Taylor Greene's pregnancy bombshell has ignited a firestorm of controversy that shows no signs of abating. Stay tuned as we continue to unravel the mysteries surrounding this extraordinary saga. Thank you for watching.
Label: Fake

---

Transcript: Législative, eux gestent honteux de Macron pour voler la victoire du RN de Bardella, le gouvernement Macron est-il impliqué dans une manipulation des résultats électoraux pour voler la victoire à Jordan Bardella du Rassemblement National ? Les affirmations récentes des partisans de Macron suggèrent qu'il y a eu des décisions majeures prises en coulisses. Cette situation récurrente où la Russie est systématiquement accusée lorsque les partis occidentaux libéraux et centristes perdent du terrain se reproduit une fois de plus en France. Le parti populiste d'extrême droite, dirigé par Marine Le Pen et Jordan Bardella, connaît des succès électoraux sans précédent. Les médias français et occidentaux alimentent une propagande alarmiste en rejetant la responsabilité sur d'autres acteurs. Depuis l'élection présidentielle américaine de 2016, Hillary Clinton et ses partisans ont attribué leur défaite à une ingérence russe, le Russiagate ou la rage russe est devenue un terme courant. Le Washington Post, en s'appuyant sur les services de renseignement français et des sources anonymes, a récemment publié une cartographie détaillée d'un prétendu écosystème de campagne d'influence russe visant les élections françaises et les Jeux olympiques depuis près d'un an. Ces allégations soulèvent des questions sur la capacité présumée des Russes à anticiper les actions politiques, comme la décision surprenante de Macron de dissoudre l'Assemblée nationale après son échec aux élections européennes. Le Monde a également relayé un rapport attaquant le Rassemblement national, affirmant qu'il était complice de la Russie. Cependant, le pari risqué de Macron pour les élections anticipées s'est soldé par un échec retentissant, indépendamment du résultat du second tour le 7 juillet. Ces accusations récurrentes et infondées contre la Russie semblent servir de bouc émissaire pour masquer les échecs politiques et les divisions internes au sein des pays occidentaux.
Label: Fake

---

Transcript: ${transcript}
Rationale:
`
