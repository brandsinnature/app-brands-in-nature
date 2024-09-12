import Spinner from "./Spinner";

export default function LoadingMessage() {
    return (
        <div className="flex flex-col justify-center items-center w-full h-full">
            <p>Initializing the scanner...</p>
            <Spinner color="white" />
            {/* <p>(This can also be done in the background)</p> */}
        </div>
    );
}
