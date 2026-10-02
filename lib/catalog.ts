import { normalizeTitle } from '@/lib/epg';
import { parseGenres } from '@/lib/genres';

/** Manual catalog from BantanTV 2.0 EPG movie list (genres + Mongolian synopsis). */
export type CatalogEntry = {
  title: string;
  genres: string; // English sheet-style, comma-separated
  description?: string;
  year?: number;
  rating?: string;
};

export const CATALOG: CatalogEntry[] = [
  { title: 'ESCAPE FROM MOGADISHU', genres: 'Action, Drama, Thriller', year: 2021, rating: '13+', description: '1991 онд болж байсан Сомали улсын иргэний дайны үеийн талаар гарах ба тухайн үед Могадишу хотод байсан хоёр Солонгосын дипломатууд хэрхэн тэр аймшигт үймээнээс хамтдаа зугтаж буй талаар өгүүлэх юм.' },
  { title: 'The Pirates', genres: 'Action, Adventure, Comedy', year: 2014, rating: '13+' },
  { title: 'THE SPACE BETWEEN US', genres: 'Drama, Romance, Sci-Fi', year: 2017, rating: '13+', description: 'Ангараг дээр төрсөн анхны хүн дэлхий рүү анх удаа аялна. Тэрээр өөрийгөө хэрхэн бий болсныг мэдэхийн тулд гудамжны сэргэлэн охинтой хамт адал явдал явдлыг эхлүүлдэг.' },
  { title: 'START-UP', genres: 'Action, Comedy, Drama', year: 2019, rating: '13+', description: '2 залуу амьдралын хатуу хөтүүтэй нүүр тулж, эр хүн болж байгаа түүхийг харуулна.' },
  { title: 'CRAZY ROMANCE', genres: 'Comedy, Drama, Romance', year: 2019, rating: '13+', description: 'Өмнөх найз бүсгүйгээ явуулж чадахгүй байгаа Жэ Хүүн найз залуугаасаа салж байгаа Сун Ён нарын хайрын түүхийг өгүүлнэ.' },
  { title: 'MAN IN LOVE', genres: 'Drama, Romance', year: 2014, rating: '13+', description: 'Тэ Ил эргэн тойрноо харах завгүй дээрэмчний амьдралаар амьдарч ирсэн бөгөөд нэг өдөр өөрийгөө эдгэршгүй өвчтэй, амьдрах хугацаа тийм ч их үлдээгүй гэдгийг мэддэг. Тэрээр анх удаа Хо-Жун хэмээх эмэгтэйд дурлана.' },
  { title: 'MIRACLE IN CELL NO.7', genres: 'Comedy, Drama', year: 2013, rating: '13+', description: 'Сэтгэцийн өвчтэй аав болон өхөөрдөм хөөрхөн охин хоёрын түүх.' },
  { title: 'THE GANGSTER, THE COP, THE DEVIL', genres: 'Action, Crime, Drama', year: 2019, rating: '13+', description: 'Гэмт хэргийн босс цагдаа нартай нийлж цуврал алуурчинг мөрдөн мөшгинө.' },
  { title: 'Train To Busan', genres: 'Action, Horror, Thriller', year: 2016, rating: '13+' },
  { title: 'John Wick 4', genres: 'Action, Crime, Thriller', year: 2023, rating: '13+' },
  { title: 'JOHN WICK: CHAPTER 4', genres: 'Action, Crime, Thriller', year: 2023, rating: '13+', description: 'Домогт алуурчин Жон Вик эрх чөлөөнийхөө төлөө зөвлөлийн эсрэг тулалдана. Гэвч зөвлөлийн шинэ гишүүн хуучин анд нөхдийг нь өөрийнх нь эсрэг босгох үед Жон Вик аминаас үнэтэй эрх чөлөөгөө олж авч чадах болов уу?' },
  { title: 'UPON THE MAGIC ROADS', genres: 'Adventure, Fantasy', year: 2021, rating: '6+', description: 'Тэнэг Иван ба түүний бөгтөртэй бяцхан морьхон хоёр харгис хааны зарлигаар алсын аянд гарж Галт шувууны эрэлд гарна.' },
  { title: 'LIFE IS BEAUTIFUL', genres: 'Drama, Musical', year: 2022, rating: '13+', description: 'Нөхрөөсөө бага насныхаа хайртыг төрсөн өдрийн бэлэг болгон олоход нь туслахыг гуйсан эхнэрийн тухай гарна. Нөхрийнх нь сонголт бол эхнэрийнхээ сүүлийн хүслийг биелүүлж түүнтэй хамт аялалд гарах явдал юм.' },
  { title: 'ALICE DARLING', genres: 'Drama, Thriller', year: 2022, rating: '13+', description: 'Хүчирхийллийн харилцаанд баригдсан залуу эмэгтэй хамгийн дотны хоёр найзынхаа зохион байгуулсан хөндлөнгийн оролцоонд өөрийн мэдэлгүй оролцдог. Тэд цааш ямар арга хэрэглэх бол?' },
  { title: 'ABOUT MY FATHER', genres: 'Comedy', year: 2023, rating: '13+', description: 'Себастиан сүйт бүсгүйгээ аавдаа танилцуулах бөгөөд амралтын өдрүүдээр хадмуудтайгаа танилцана гэдгээ хэлнэ. Гэвч аав нь хамт явъя гэж хэлснээс болж амралтын өдрүүд нь зөвхөн соёлын зөрчилдөөн болж хувирна.' },
  { title: 'THREE WISHES FOR CINDERELLA', genres: 'Family, Fantasy', year: 2022, rating: '6+', description: 'Энэ бол бидний мэдэх Үнсгэлжингийн өөр нэгэн түүх. Цаст ууланд явсан Үнсгэлжин ордны ханхүүтэй санамсаргүй байдлаар танилцаж тэдний хайр дурлал эхлэх бөгөөд энэ харилцаанд түүний хорон санаат хойд ээж хэрхэн саад хийх бол?' },
  { title: 'NATIONAL CHAMPIONS', genres: 'Drama, Sport', year: 2021, rating: '13+', description: 'Коллежийн хөлбөмбөгийн улсын аварга шалгаруулах тэмцээн болохоос гурав хоногийн өмнө тоглогч нар ажил хаялт хийж, бүх оюутан тамирчдад нөхөн төлбөр олгох хүртэл тэмцээнд оролцохгүй гэдгээ мэдэгдэв. Тэд зорьсондоо хүрэх болов уу?' },
  { title: 'SMUGGLERS', genres: 'Action, Crime', year: 2023, rating: '13+', description: '1970-аад оны үед Солонгосын далайн эргийн нэгэн жижиг тосгонд 2 шумбагч найз амьдардаг байв. Амьдралын эрхээр тэд өөрсдийн чадварыг ашиглан хууль бус наймаануудад оролцож эхлэх ба мафийн анхааралд өртсөн тус тосгонд адал явдал эхэлнэ.' },
  { title: 'DECISION TO LEAVE', genres: 'Crime, Mystery, Drama', year: 2022, rating: '13+', description: 'Ууланд нас барсан хүний хэргийг мөрдөж буй мөрдөгч талийгаач эрийн нууцлаг эхнэртэй түүний нууцлаг үйлдлээр уулздаг.' },
  { title: 'BROKER', genres: 'Drama', year: 2022, rating: '13+', description: 'Залуу бүсгүй шинэ төрсөн хүүхдээ үрчлүүлэхээр сүмд өгөхөөр шийдсэн боловч эдгээр хүүхдүүдийг худалдахаар хулгайлдаг идэвхтэй бүлэглэл байдгийг олж мэдэв.' },
  { title: 'THE BEEKEEPER', genres: 'Action, Thriller', year: 2024, rating: '13+', description: 'Энгийн даруу зөгийчин залуугийн амьдралд хамгийн ихээр тусалдаг найрсаг эмэгтэй санхүүгийн компанид луйвардуулсанаас болж өөрийн амийг хорлоно. Өмнө нь тусгай ажилтан байсан зөгийчин энэ бүхний учрыг олохын тулд эргэн ажилдаа орлоо.' },
  { title: 'CONCRETE UTOPIA', genres: 'Action, Adventure, Drama', year: 2023, rating: '13+', description: 'Сөүл хотод аймшигт газар хөдлөлт болно. Олон зуун барилга байгууламж нурж амьд үлдсэн цөөхөн хэдэн хүмүүс нэгэн байранд цугларна. Тэдгээр хүмүүс юу ч үгүй балгас болсон тэр газар амьд үлдэхийн төлөө тэмцэлдэж эхлэх ба хүний мөн чанар энэ үед гарч ирнэ.' },
  { title: 'SAW X', genres: 'Horror, Mystery, Thriller', year: 2023, rating: '16+', description: 'Алдарт алуурчин Жон Кремер хорт хавдараа эмчлүүлэхийн тулд Мексик улсыг зорино. Гэвч тэндэхийн эмч нар хүмүүсийн өвчнөөр луйвар хийдэг болохыг олж мэднэ.' },
  { title: 'MOONFALL', genres: 'Sci-Fi, Adventure, Action', year: 2022, rating: '13+', description: 'Үл мэдэгдэх нууцлаг хүч сарыг тойрог замыг эвдэж дэлхийтэй мөргөлдөх аюул үүсгэх бөгөөд энэ тохиолдолд бидний мэдэх амьдрал зөвхөн үнс болж үлдэх байв.' },
  { title: 'DELIVER US FROM EVIL', genres: 'Action, Drama', year: 2020, rating: '16+', description: 'Хөлсний алуурчин төрснөөс нь хойш уулзаагүй охиноо эрхтэн наймаалагчдын гараас аврахаар Тайланд руу явна.' },
  { title: 'HELLO GHOST', genres: 'Comedy, Drama', year: 2010, rating: '13+', description: 'Сүнс харж эхэлсэн залуу амьдралын утга учрыг ухаарч эхэлнэ.' },
  { title: 'DALLAS BUYERS CLUB', genres: 'Biography, Drama', year: 2013, rating: '16+', description: '1985 онд уг үйл явдал өрнө ба цахилгаанчин Рон Вүүдрүүф үйлдвэрийн ослоор эмнэлэгт хүргэгдэх ба түүний шинжилгээнд хүний дархлалын хомсдолын вирус эерэг гарах бөгөөд түүнд амьд явах 30 хоногийн нас үлдсэн болохыг хэлнэ.' },
  { title: 'THE HUNGER GAMES: BALLAD OF SONGBIRDS AND SNAKES', genres: 'Action, Adventure, Drama', year: 2023, rating: '13+', description: 'Энэ бол Өлсгөлөн Тоглоомын эхний үеийн түүх юм. 18 настай Снөү 10 дахь удаагийн Өлсгөлөн Тоглоомын оролцогч Люси-ийн зааварлагчаар томилогдох ба тэдний харилцаа энэ үеэс эхлэн гүнзгийрч эхэлнэ.' },
  { title: 'BORDERLANDS', genres: 'Action, Adventure, Comedy, Sci-Fi', year: 2024, rating: '13+', description: 'Асар их хүчийг өөртөө агуулсан түлхүүрийг эзэмшиж буй бяцхан охиныг олохын тулд санамсаргүй бүрдсэн баг маань аялалд гарлаа.' },
  { title: 'GREENLAND', genres: 'Action, Drama', year: 2020, rating: '13+', description: 'Аймшигт байгалийн гамшигаас амь гарах гэж тэмцэж байгаа нэгэн гэр бүлийн тухай өгүүлнэ.' },
];

const byNorm = new Map(CATALOG.map((e) => [normalizeTitle(e.title), e]));

export function getCatalogEntry(title: string): CatalogEntry | undefined {
  return byNorm.get(normalizeTitle(title));
}

export function catalogGenresFor(title: string): string[] {
  const e = getCatalogEntry(title);
  if (!e) return [];
  return parseGenres(e.genres);
}

export function catalogDescription(title: string): string | undefined {
  return getCatalogEntry(title)?.description;
}
