import { Effect, pipe, Console } from "effect";

import { askAi } from "../../services/askAI";
import { HttpError } from "../../types/errors";

const API_KEY = process.env.AI_DEVS_API_KEY as string;

const reportUrl = "https://centrala.ag3nts.org/report";
// const reportUrl = "https://purring-traffic-74.webhook.cool";

const createPrompt = () => `
<prompt_objective>
The purpose of this prompt is to deduce and return the specific street name where Andrzej Maj teaches, based on careful analysis of transcripts and internal knowledge. </prompt_objective>

<prompt_rules>

READ and EXTRACT information from the provided transcripts, identifying any patterns or repeated mentions of locations.
PRIORITIZE any educational institutions or well-known academic streets, especially in Kraków, where details imply a location tied to Andrzej Maj's professional role.
USE internal knowledge to confirm or override inconsistent testimonies, especially in cases of ambiguity, but do not assume unless there is reasonable certainty from provided context clues.
FOCUS on identifying the correct educational location rather than unrelated or contradictory street names.
LIMIT output strictly to the identified street name, with no additional commentary or data. </prompt_rules>
<prompt_output>

Output should be a single street name in concise format. </prompt_output>
<prompt_examples>

Scenario 1: If testimonies mention other streets that seem unconnected to academia or teaching, the AI disregards these and uses internal knowledge for educational locations relevant to Andrzej Maj.
Scenario 2: If transcripts ambiguously reference streets, the AI uses hints around academic affiliation, especially those associated with mathematics or computer science, to focus on known academic locations. </prompt_examples>
 <transcript_contents>
  <transcript>
       Andrzej Maj? No, coś kojarzę. Był taki gość i pamiętam. Pracował u nas w biurze. Był project managerem. Chociaż, moment, może to jednak był Arkadiusz Maj? Też na literę A. Mógłbym się pomylić. No jednak tak, Arkadiusz. Z Arkadiuszem współpracowałem w Wałbrzychu. Pamiętam, że był naprawdę wrednym facetem. Normalnie nie chciałbyś z takim pracować. Jak coś było do zrobienia, to albo stosował typową spychologię, albo zamiatał sprawę pod dywan. Nigdy człowieka nie docenił. Wszystkie zasługi brał na siebie. Był naprawdę beznadziejny. Arkadiusza pamiętam jak dziś, więc jeśli chcecie go aresztować, to jak najbardziej, jestem za. Takich ludzi powinno się zamykać, a nie mnie, bo ja jestem niewinny. Jak chcecie, to ja wam mogę adres nawet podać. Stefana Batorego, 68D. Tylko D, jak Danuta, bo pod B mieszka jego ciocia, a ona była fajna. Jak będziecie Arkadiusza aresztować, to proszę powiedzcie mu z pozdrowieniami od Adama, a on będzie wiedział o kogo chodzi.
  </transcript>
  <transcript>
Może go znałam, a może nie. Kto wie? Zacznijmy od tego, że nie macie prawa mnie tutaj przetrzymywać. Absolutnie nic złego nie zrobiłam. Trzymacie mnie tutaj niezgodnie z prawem. Wiem, że teraz wszystko się zmienia na świecie i roboty dyktują jak ma być, ale o ile się nie mylę, dawne prawo nadal obowiązuje. Mamy tutaj jakąś konstytucję, prawda? Chcę rozmawiać z adwokatem. Maja znałam, to prawda. Było to kilka lat temu. Pracowaliśmy razem w Warszawie, ale na tym nasza znajomość się skończyła. Byliśmy w tej samej pracy. Czy to jest jakieś przestępstwo? To jest coś niedozwolonego w naszym kraju? Za to można wsadzać ludzi do więzienia? On wjechał z Warszawy, nie ma go tam. Z tego co wiem, pojechał do Krakowa. Wykładać tam chciał chyba coś z informatyki czy matematyki. Nie wiem, jak to się skończyło. Może to były tylko plany?
  </transcript>
  <transcript>
   No pewnie. Obserwowałem jego dokonania i muszę przyznać, że zrobił na mnie wrażenie. Ja mam taką pamięć opartą na wrażeniach i wrażenie mi pozostało po pierwszym spotkaniu. Nie wiem kiedy to było, ale on był taki nietypowy. Później zresztą zastanawiałem się, jak to jest możliwe, że robi tak wiele rzeczy. Nieprzeciętny, ale swój. Znaleźł w końcu to Andrzej, naukowiec. Później chyba zniknął z miejsc, gdzie go śledziłem. Przy okazji jakiejś konferencji czy eventu chyba widziałem go, ale nie udało mi się z nim porozmawiać. Nie, nie mamy żadnego kontaktu. Nie jest moją rodziną, więc dlaczego miałbym ukrywać? Ja go tylko obserwowałem. różnych ludzi się obserwuje. To nie zbrodnia, prawda? Kiedy w końcu zostawicie mi spokoju?
<transcript>
 Gość miał ambicje, znam go w sumie od dzieciństwa. W zasadzie to znałem, bo trochę nam się kontakt urwał, ale jak najbardziej pracowaliśmy razem. On zawsze chciał pracować na jakiejś znanej uczelni. Po studiach pamiętam, został na uczelni i robił doktorat z sieci neuronowych i uczenia maszynowego. Potem przeniósł się na inną uczelnię i pracował chwilę w Warszawie, ale to był tylko epizod z tą Warszawą. On zawsze mówił, że zawsze musi pracować na jakiejś ważnej uczelni, bo w tym środowisku bufonów naukowych to się prestiż liczy. Mówił, królewska uczelnia, to jest to, co chce osiągnąć. Na tym mu zależało. Mówił, ja się tam dostanę, zobaczysz, no i będę tam wykładał. Z tego co wiem, no to osiągnął swój cel. No i brawa dla niego. Lubię ludzi, którzy jak się uprą, że coś zrobią, to po prostu to zrobią. Ale to nie było łatwe. Ale gościowi się udało i to wcale nie metodą po trupach do celu. Andrzej był okej. Szanował ludzi. Marzył o tej uczelni i z tego co wiem, to na niej wylądował. Nie miałem z nim już kontaktu, ale widziałem, że profil na LinkedIn zaktualizował. Nie powiedzieliście mi, dlaczego go szukacie, bo praca na uczelni to nie jest coś zabronionego, prawda? prawda? A, z rzeczy ważnych, to chciałbym wiedzieć, dlaczego jestem tu, gdzie jestem i w sumie kiedy się skończy to przesłuchanie. Dostaję pytania chyba od dwóch godzin i w sumie powiedziałem już wszystko, co wiem.
</transcript>
<transcript>
 Ale wy tak na serio pytacie? Bo nie znać Andrzeja Maja w naszych kręgach, to naprawdę byłoby dziwne. Tak, znam go. Podobnie jak pewnie kilka tysięcy innych uczonych go zna. Andrzej pracował z sieciami neuronowymi. To prawda. Był wykładowcą w Krakowie. To także prawda. Z tego co wiem, jeszcze przynajmniej pół roku temu tam pracował. Wydział czy tam Instytut Informatyki i Matematyki Komputerowej, czy jakoś tak. Nie pamiętam, jak się to dokładnie teraz nazywa, ale w każdym razie gość pracował z komputerami i sieciami neuronowymi. No chyba jesteście w stanie skojarzyć fakty. Nie? Komputery, sieci neuronowe, to się łączy. bezpośrednio z nim nie miałam kontaktu. Może raz na jakimś sympozjum naukowym pogratulowałam mu świetnego wykładu, ale to wszystko, co nas łączyło. Jeden uścisk dłoni, nigdy nie wyszliśmy do wspólnego projektu, nigdy nie korespondowałam z nim. Tak naprawdę znam go jako celebrytę ze świata nauki, ale to wszystko, co mogę wam powiedzieć.
</transcript>
 Andrzejek, Andrzejek, myślę, że osiągnął to, co chciał. Jagiełło był z niego bardzo dumny, chociaż nie, nie wiem, może coś mi się myli. Jagiełło chyba nie był jego kolegą i raczej nie miał z tą uczelnią wiele wspólnego. To tylko nazwa. Taka nazwa. To był jakiś wielki gość. Bardziej co ją założył. Ale co to ma do rzeczy? Ale czy Andrzejek go znał? Chyba nie. Ale nie wiem. Bo Andrzejek raczej nie żył w XIV wieku. Kto go tam wie? Mógł odwiedzić XIV wiek. Ja bym odwiedził. Tego instytutu i tak wtedy nie było. To nowe coś. Ta ulica od matematyka, co wpada w komendanta, to chyba XX wiek. ten czas mi się miesza wszystko jest takie nowe to jest nowy lepszy świat podoba ci się świat w którym żyjesz Andrzej Andrzej zawsze był dziwny kombinował coś i mówił że podróże w czasie są możliwe razem pracowali nad tymi podr to to wszystko co teraz si dzieje i ten stan w kt jestem to jest wina tych wszystkich podr tych temat tych rozm Ostatecznie nie wiem, czy Andrzejek miał rację i czy takie podróże są możliwe. Jeśli kiedykolwiek spotkacie takiego podróżnika, dajcie mi znać. Proszę, to by oznaczało, że jednak nie jestem szalony, ale jeśli taki ktoś wróci w czasie i pojawi się akurat dziś, to by znaczyło, że ludzie są zagrożeni. jesteśmy zagrożeni. Andrzej jest zagrożony. Andrzej nie jest zagrożony. Andrzej jest Andrzej jest zagrożony. Ale jeśli ktoś wróci w czasie i pojawi się akurat dziś, to by to by znaczyło, że ludzie są zagrożeni. Jesteśmy zagrożeni? Andrzej jest zagrożony? Andrzej nie jest zagrożony. To Andrzej jest zagrożeniem. To Andrzej jest zagrożeniem. Andrzej nie jest zagrożony. Andrzej jest zagrożeniem. Dziękuje za uwagę.
<transcript>

</transcript>

  </transcript_contents>
`;

const sendReport = (data: string) =>
  Effect.tryPromise({
    try: async () => {
      const body = JSON.stringify({
        task: "mp3",
        apikey: API_KEY,
        answer: data,
      });

      const response = await fetch(reportUrl, {
        method: "POST",
        body,
        cache: "no-cache",
      });
      return response.json();
    },

    catch: (e) => {
      console.log(e);
      return new HttpError(e);
    },
  });

const program = pipe(
  askAi(createPrompt()),
  Effect.tap(Console.log),
  Effect.andThen(sendReport)
);

export async function GET() {
  return Effect.runPromise(program).then((data) => {
    if (typeof data === "string") {
      return new Response(JSON.stringify({ data }), { status: 200 });
    } else {
      return new Response(JSON.stringify({ data }), { status: 200 });
    }
  });
}
