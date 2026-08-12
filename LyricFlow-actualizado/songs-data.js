// Base de datos de canciones iniciales por defecto para LyricFlow
const DEFAULT_SONGS = [
  {
    id: "de-musica-ligera",
    title: "De Música Ligera",
    artist: "Soda Stereo",
    key: "Bm",
    bpm: 124,
    lyrics: `[Bm] Ella dur[G]mió al ca[D]lor de las [A]masas
[Bm] Y yo des[G]perté [D]queriendo so[A]ñarla
[Bm] Algún ti[G]empo a[D]trás pen[A]sé en escri[Bm]birle
Que nunca sor[G]prendí [D]las trampas del [A]amor

De a[Bm]quel a[G]mor
De [D]música li[A]gera
N[Bm]ada nos l[G]ibra
N[D]ada más qu[A]eda

[Bm] No envi[G]arás ce[D]nizas de [A]rosas
[Bm] Ni com[G]partirás [D]brisas ti[A]bias
[Bm] Amor de[G]sarmado [D]marcas en mi [A]piel
[Bm] Una bar[G]ca en el [D]viento en mi [A]piel

De a[Bm]quel a[G]mor
De [D]música li[A]gera
N[Bm]ada nos l[G]ibra
N[D]ada más qu[A]eda

(Solo de guitarra)
[Bm]  [G]  [D]  [A] (x4)

De a[Bm]quel a[G]mor
De [D]música li[A]gera
N[Bm]ada nos l[G]ibra
N[D]ada más qu[A]eda

N[Bm]ada más qu[G]eda... [D] [A]
N[Bm]ada más qu[G]eda... [D] [A]`
  },
  {
    id: "lamento-boliviano",
    title: "Lamento Boliviano",
    artist: "Los Enanitos Verdes",
    key: "Em",
    bpm: 115,
    lyrics: `[Em] Me quieren agi[Bm]tar
[Am] Me incitan a gri[Em]tar
[Em] Soy como una ro[Bm]ca
[Am] Palabras no me [Em]tocan

[Em] Adentro hay un vol[Bm]cán
[Am] Que pronto va a esta[Em]llar
[Em] Yo quiero estar tran[Bm]quilo
[Am] Pero mi situación es un de[Em]sastre

[Em] Y yo estoy a[Bm]quí
Borracho y [Am]loco
Y mi corazón i[Em]diota
Siempre [B7]brillará (y siempre brillará)

[Em] Y yo te a[Bm]maré
Te amaré por [Am]siempre
Nena, no te [Em]peines en la [B7]cama
Que los viajantes [Em]se van a atra[Bm]sar [Am] [Em]

[Em] [Bm] [Am] [Em] (Solo de guitarra)

[Em] Y yo estoy a[Bm]quí
Borracho y [Am]loco
Y mi corazón i[Em]diota
Siempre [B7]brillará (y siempre brillará)

[Em] Y yo te a[Bm]maré
Te amaré por [Am]siempre
Nena, no te [Em]peines en la [B7]cama
Que los viajantes [Em]se van a atra[Bm]sar [Am] [Em]`
  },
  {
    id: "imagine",
    title: "Imagine",
    artist: "John Lennon",
    key: "C",
    bpm: 76,
    lyrics: `[C] Imagine there's no [Cmaj7]heaven
[F] It's easy if you [C]try
No hell be[Cmaj7]low us
[F] Above us only sky

[F] Imagine [Am]all the peo[Dm7]ple
[G] Living for to[G7]day

[C] Imagine there's no [Cmaj7]countries
[F] It isn't hard to [C]do
Nothing to [Cmaj7]kill or die for
[F] And no religion too

[F] Imagine [Am]all the peo[Dm7]ple
[G] Living life in [G7]peace

[F] You may [G]say I'm a [C]dreamer [E7]
[F] But I'm [G]not the only [C]one [E7]
[F] I hope some[G]day you'll [C]join us [E7]
[F] And the [G]world will [C]be as one

[C] Imagine no pos[Cmaj7]sessions
[F] I wonder if you [C]can
No need for [Cmaj7]greed or hunger
[F] A brotherhood of man

[F] Imagine [Am]all the peo[Dm7]ple
[G] Sharing all the [G7]world

[F] You may [G]say I'm a [C]dreamer [E7]
[F] But I'm [G]not the only [C]one [E7]
[F] I hope some[G]day you'll [C]join us [E7]
[F] And the [G]world will [C]live as one`
  },
  {
    id: "creep",
    title: "Creep",
    artist: "Radiohead",
    key: "G",
    bpm: 92,
    lyrics: `[G] When you were here be[B]fore
Couldn't look you in the [C]eye
You're just like an an[Cm]gel
Your skin makes me cry

[G] You float like a fea[B]ther
In a beautiful [C]world
I wish I was spe[Cm]cial
You're so very special

But I'm a [G]creep
I'm a [B]weirdo
What the hell am I doing [C]here?
I don't be[Cm]long here

[G] I don't care if it [B]hurts
I want to have con[C]trol
I want a perfect bo[Cm]dy
I want a perfect soul

[G] I want you to no[B]tice
When I'm not a[C]round
You're so very spe[Cm]cial
I wish I was special

But I'm a [G]creep
I'm a [B]weirdo
What the hell am I doing [C]here?
I don't be[Cm]long here

She's running out the [G]door
She's running [B]out
She run, run, run, [C]run
Ru[Cm]n...

[G] Whatever makes you [B]happy
Whatever you [C]want
You're so very spe[Cm]cial
I wish I was special

But I'm a [G]creep
I'm a [B]weirdo
What the hell am I doing [C]here?
I don't be[Cm]long here
I don't be[G]long here`
  },
  {
    id: "rayando-el-sol",
    title: "Rayando El Sol",
    artist: "Maná",
    key: "G",
    bpm: 90,
    lyrics: `[G] Rayando el sol, [D] desespera[Em]ción
Es más [C]fácil llegar al [D]sol que a tu cora[G]zón
[G] Me muero por ti, [D] viviendo sin [Em]ti
Y el [C]sol se levanta, [D] y yo sin tu a[G]mor

[G] A tu casa yo fui y [D]no te encontré
En el par[Em]que te busqué, y tam[C]poco te hallé
[G] Te busqué en la cantina, [D] en la que te vi
Y en mi [Em]mente te llevo, nena, [C]no puedo vivir

[G] Rayando el sol, [D] desespera[Em]ción
Es más [C]fácil llegar al [D]sol que a tu cora[G]zón
[G] Me muero por ti, [D] viviendo sin [Em]ti
Y el [C]sol se levanta, [D] y yo sin tu a[G]mor

[Am] Y es que te busco por to[D]das partes
[Am] Y no te puedo encon[D]trar
[Am] Y es que te tengo meti[D]da en el alma, mi a[C]mor
[C] No me dejes, no me dejes [D]desesperar

[G] Rayando el sol, [D] desespera[Em]ción
Es más [C]fácil llegar al [D]sol que a tu cora[G]zón
[G] Me muero por ti, [D] viviendo sin [Em]ti
Y el [C]sol se levanta, [D] y yo sin tu a[G]mor`
  }
];
