import json, tempfile, os
from bson.objectid import ObjectId
import moviepy.editor

def start(message, fs_videos, fs_mp3s):
    message = json.loads(message)

    # empty temp file
    tf = tempfile.NamedTemporaryFile()
    # video content
    out = fs_videos.get(ObjectId(message["video_fid"]))
    # add video content to temp file
    tf.write(out.read())
    # create audio from temp video file
    audio = moviepy.editor.VideoFileClip(tf.name).audio
    tf.close()  # close after audio extraction

    # write audio to the file
    tf_path = tempfile.gettempdir() + f"/{message['video_fid']}.mp3"
    audio.write_audiofile(tf_path)
    audio.close()  # close the audio clip

    # save the file to the mongodb database
    f = open(tf_path, "rb")
    data = f.read()
    fid = fs_mp3s.put(data, metadata={"video_fid": message["video_fid"]})
    f.close()
    os.remove(tf_path)

    message["mp3_fid"] = str(fid)
    # No notification publish; status/download handled via gateway lookups
    return None
