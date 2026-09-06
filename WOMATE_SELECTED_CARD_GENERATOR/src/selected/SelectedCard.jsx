import React,{
  useEffect,
  useRef,
  useState
} from 'react';

import {
  verifySelectedLearner,
  selectedCardConfigured
} from './selectedCardApi';

import {
  renderSelectedCard,
  downloadCanvas,
  shareCanvas
} from './selectedCardRenderer';

import './selectedCard.css';

export default function SelectedCard(){
  const [email,setEmail]=useState('');
  const [code,setCode]=useState('');
  const [verified,setVerified]=useState(null);

  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const [photo,setPhoto]=useState(null);
  const [zoom,setZoom]=useState(1);
  const [offsetX,setOffsetX]=useState(0);
  const [offsetY,setOffsetY]=useState(0);

  const canvasRef=useRef(null);

  useEffect(()=>{
    document.title='I Have Been Selected | WOMATE';
  },[]);

  useEffect(()=>{
    if(!verified || !canvasRef.current) return;

    renderSelectedCard(
      canvasRef.current,
      {
        ...verified,
        photo,
        zoom,
        offsetX,
        offsetY
      }
    );
  },[
    verified,
    photo,
    zoom,
    offsetX,
    offsetY
  ]);

  async function verify(e){
    e.preventDefault();

    setBusy(true);
    setError('');
    setNotice('');

    try{
      const result=
        await verifySelectedLearner(
          email,
          code
        );

      setVerified(result);
    }catch(err){
      setError(
        err?.message||
        'Unable to verify selection.'
      );
    }finally{
      setBusy(false);
    }
  }

  function choosePhoto(e){
    const file=e.target.files?.[0];

    if(!file) return;

    setError('');
    setNotice('');

    if(
      !/^image\/(png|jpe?g|webp)$/i.test(
        file.type
      )
    ){
      setError(
        'Upload a JPG, PNG or WebP photograph.'
      );
      return;
    }

    if(file.size>12*1024*1024){
      setError(
        'Please use an image smaller than 12 MB.'
      );
      return;
    }

    const url=URL.createObjectURL(file);
    const img=new Image();

    img.onload=()=>{
      setPhoto(img);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);

      URL.revokeObjectURL(url);
    };

    img.onerror=()=>{
      setError(
        'That photograph could not be opened.'
      );

      URL.revokeObjectURL(url);
    };

    img.src=url;
  }

  const safeName=
    verified?.fullName||
    'Learner';

  const filename=
    `WOMATE_Selected_${safeName
      .replace(/[^a-z0-9]+/gi,'_')
      .replace(/^_|_$/g,'')}.png`;

  function download(){
    if(!photo || !canvasRef.current) return;

    downloadCanvas(
      canvasRef.current,
      filename
    );
  }

  async function share(){
    if(!photo || !canvasRef.current) return;

    setNotice('');

    try{
      const shared=
        await shareCanvas(
          canvasRef.current,
          filename
        );

      if(!shared){
        download();

        setNotice(
          'Your PNG has been downloaded. Share it from your device.'
        );
      }
    }catch(err){
      if(err?.name!=='AbortError'){
        setNotice(
          'Direct sharing is unavailable here. Download the PNG and share it from your device.'
        );
      }
    }
  }

  function reset(){
    setVerified(null);
    setPhoto(null);
    setCode('');
    setError('');
    setNotice('');
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }

  return (
    <div className="selectedPage">

      <header className="selectedTop">
        <a
          className="selectedBrand"
          href="/"
          aria-label="WOMATE home"
        >
          <img
            src="/assets/img/logo.svg"
            alt="WOMATE"
          />
        </a>

        <span>
          OFFICIAL SELECTION CARD
        </span>
      </header>

      <main className="selectedMain">

        <section className="selectedIntro">
          <span>
            SHE LEADS · COHORT 2
          </span>

          <h1>
            You've been selected.
          </h1>

          <p>
            Verify your WOMATE selection,
            add your photograph and create
            your official share card.
          </p>
        </section>

        {!verified ? (

          <section className="selectedVerify">

            <div className="selectedVerifyCopy">
              <small>
                01 · VERIFY
              </small>

              <h2>
                Confirm your selection.
              </h2>

              <p>
                Enter the email address and
                selection code contained in
                your official WOMATE
                selection message.
              </p>

              <div className="selectedPrivacy">
                Your photograph is processed
                locally in your browser.
                WOMATE does not upload or
                permanently store it to
                create this card.
              </div>
            </div>

            <form onSubmit={verify}>

              <label>
                Email address

                <input
                  required
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e=>
                    setEmail(e.target.value)
                  }
                />
              </label>

              <label>
                Selection code

                <input
                  required
                  type="text"
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  placeholder="Your WOMATE code"
                  maxLength={20}
                  value={code}
                  onChange={e=>
                    setCode(
                      e.target.value
                        .toUpperCase()
                    )
                  }
                />
              </label>

              {!selectedCardConfigured && (
                <p className="selectedError">
                  Selection verification is
                  not configured on this
                  deployment yet.
                </p>
              )}

              {error && (
                <p
                  className="selectedError"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={
                  busy||
                  !selectedCardConfigured
                }
              >
                {
                  busy
                    ? 'Verifying…'
                    : 'Verify selection'
                }
              </button>

            </form>

          </section>

        ) : (

          <section className="selectedStudio">

            <aside className="selectedControls">

              <small>
                02 · CREATE
              </small>

              <h2>
                {verified.fullName}
              </h2>

              <p>
                {verified.programmeName}
                <br/>
                <b>
                  {verified.cohortLabel}
                </b>
              </p>

              <label className="selectedUpload">
                <span>
                  Upload photograph
                </span>

                <input
                  type="file"
                  accept="
                    image/png,
                    image/jpeg,
                    image/webp
                  "
                  onChange={choosePhoto}
                />
              </label>

              {photo && (
                <div className="selectedAdjust">

                  <label>
                    Zoom
                    <input
                      type="range"
                      min="1"
                      max="2.2"
                      step="0.02"
                      value={zoom}
                      onChange={e=>
                        setZoom(
                          Number(e.target.value)
                        )
                      }
                    />
                  </label>

                  <label>
                    Move left / right
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={offsetX}
                      onChange={e=>
                        setOffsetX(
                          Number(e.target.value)
                        )
                      }
                    />
                  </label>

                  <label>
                    Move up / down
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={offsetY}
                      onChange={e=>
                        setOffsetY(
                          Number(e.target.value)
                        )
                      }
                    />
                  </label>

                </div>
              )}

              {error && (
                <p className="selectedError">
                  {error}
                </p>
              )}

              <button
                type="button"
                className="selectedReset"
                onClick={reset}
              >
                Verify a different selection
              </button>

            </aside>

            <div className="selectedPreview">

              <div className="selectedCanvasWrap">
                <canvas
                  ref={canvasRef}
                  aria-label="WOMATE selected card preview"
                />
              </div>

              <div className="selectedActions">

                <button
                  type="button"
                  disabled={!photo}
                  onClick={download}
                >
                  Download PNG
                </button>

                <button
                  type="button"
                  className="selectedShare"
                  disabled={!photo}
                  onClick={share}
                >
                  Share card
                </button>

              </div>

              {!photo && (
                <p className="selectedHint">
                  Upload your photograph to
                  enable download and sharing.
                </p>
              )}

              {notice && (
                <p className="selectedHint">
                  {notice}
                </p>
              )}

            </div>

          </section>

        )}

      </main>

      <footer className="selectedFooter">
        <span>
          WOMATE · Women in Climate Action
        </span>

        <a href="/">
          womate.org
        </a>
      </footer>

    </div>
  );
}
