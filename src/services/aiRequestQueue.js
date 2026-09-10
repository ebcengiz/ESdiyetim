// Basit tek-kanallı AI istek kuyruğu.
// Bir ekran açılışta birden fazla AI çağrısı tetiklediğinde (ör. sağlık ipucu +
// VKİ tavsiyesi aynı anda) bunların art arda (paralel değil) yürütülmesini
// sağlar — ücretsiz katmanların dakika/saniye bazlı kota baskısını azaltır.
let tail = Promise.resolve();

export function enqueueAIRequest(task) {
  const run = tail.then(task, task);
  // Kuyruk zinciri bir görev reddedilse bile kopmamalı — hatayı burada yutup
  // gerçek hatayı çağırana `run` promise'i üzerinden ilet.
  tail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}
